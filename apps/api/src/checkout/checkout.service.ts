import type {
  CheckoutAddress,
  CheckoutReviewResult,
  CheckoutSession,
  PreparedOrderResult,
  ShippingOption,
} from "@ecom/types";
import { ConflictError, NotFoundError, ValidationError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import type { CheckoutPaymentMethod, CheckoutStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { AuditService } from "../audit/audit.service";
import { CartService } from "../cart/cart.service";
import { validateCoupon } from "../cart/policies/coupon.policy";
import { PrismaService } from "../prisma/prisma.service";

import { preReserveInventory, validateInventory } from "./policies/inventory.policy";
import { resolveShippingOptions, selectShippingOption } from "./policies/shipping.policy";
import { calculateTax, resolveActiveTaxRate } from "./policies/tax.policy";

const CHECKOUT_TTL_MINUTES = Number(process.env.CHECKOUT_TTL_MINUTES ?? 30);
const IDEMPOTENCY_TTL_HOURS = Number(process.env.CHECKOUT_IDEMPOTENCY_TTL_HOURS ?? 24);
const REVIEW_VALID_MINUTES = 15;

type GuestAddressInput = Omit<CheckoutAddress, "id">;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly auditService: AuditService,
  ) {}

  async create(userId?: string, sessionId?: string): Promise<CheckoutSession> {
    if (!userId && !sessionId) {
      throw new ValidationError("sessionId is required for guest checkout");
    }

    const cart = await this.cartService.findCart(userId, sessionId);
    if (!cart) throw new NotFoundError("Cart not found");

    const summary = await this.cartService.getSummaryForCartId(cart.id);
    if (summary.itemCount === 0) {
      throw new ValidationError("Cart is empty");
    }

    const unavailable = summary.items.filter((i) => !i.available);
    if (unavailable.length > 0) {
      throw new ValidationError("Some items in your cart are no longer available");
    }

    validateInventory(summary.items.map((i) => ({ variantSku: i.variantSku, quantity: i.quantity })));

    const taxRules = await this.prisma.taxRule.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    });
    const taxRate = resolveActiveTaxRate(taxRules.map((r) => Number(r.rate)));
    const taxable = Math.max(0, Number(summary.subtotal) - Number(summary.discount));
    const taxAmount = calculateTax({ taxableAmount: taxable, rate: taxRate });
    const total = taxable + Number(summary.shipping) + taxAmount;

    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MINUTES * 60 * 1000);

    const session = await this.prisma.checkoutSession.create({
      data: {
        cartId: cart.id,
        userId,
        sessionId,
        subtotal: summary.subtotal,
        discount: summary.discount,
        shippingFee: summary.shipping,
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        lineItemsSnapshot: summary.items as unknown as Prisma.InputJsonValue,
        couponsSnapshot: summary.appliedCoupons as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    });

    await this.auditService.log({
      userId,
      action: "CheckoutStarted",
      entityType: "checkout_session",
      entityId: session.id,
      metadata: { cartId: cart.id },
    });

    return this.toDto(session, summary.items, summary.appliedCoupons);
  }

  async getById(id: string, userId?: string, sessionId?: string): Promise<CheckoutSession> {
    const session = await this.loadAuthorizedSession(id, userId, sessionId);
    return this.hydrateSession(session);
  }

  async updateAddress(
    id: string,
    params: { addressId?: string; guestAddress?: GuestAddressInput; sessionId?: string },
    userId?: string,
  ): Promise<CheckoutSession> {
    const session = await this.loadAuthorizedSession(id, userId, params.sessionId);
    this.assertActive(session);

    let guestAddress: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    let addressId: string | null = null;

    if (params.addressId) {
      if (!userId) throw new ValidationError("Login required to use saved addresses");
      const address = await this.prisma.address.findFirst({
        where: { id: params.addressId, userId },
      });
      if (!address) throw new NotFoundError("Address not found");
      addressId = address.id;
    } else if (params.guestAddress) {
      this.validateGuestAddress(params.guestAddress);
      guestAddress = params.guestAddress as unknown as Prisma.InputJsonValue;
    } else {
      throw new ValidationError("addressId or guestAddress is required");
    }

    const updated = await this.prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        addressId,
        guestAddress: guestAddress ?? undefined,
        status: "address_selected",
      },
    });

    await this.logUpdated(userId, updated.id, "address");
    return this.hydrateSession(updated);
  }

  async updateShipping(
    id: string,
    shippingMethodCode: string,
    userId?: string,
    sessionId?: string,
  ): Promise<CheckoutSession> {
    const session = await this.loadAuthorizedSession(id, userId, sessionId);
    this.assertActive(session);

    const pincode = await this.resolvePincode(session);
    const methods = await this.prisma.shippingMethod.findMany({
      where: { isActive: true },
      include: { zones: true },
      orderBy: { sortOrder: "asc" },
    });

    const cartSummary = await this.cartService.getSummaryForCartId(session.cartId);
    const qualifiesFree =
      Number(cartSummary.shipping) === 0 ||
      cartSummary.appliedCoupons.some((c) => c.type === "free_shipping");

    const options = resolveShippingOptions({
      pincode,
      methods,
      freeShipping: qualifiesFree,
    });

    const selected = selectShippingOption(options, shippingMethodCode);
    const taxable = Math.max(0, Number(session.subtotal) - Number(session.discount));
    const taxAmount = Number(session.taxAmount);
    const total = taxable + selected.fee + taxAmount;

    const updated = await this.prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        shippingMethodCode: selected.code,
        shippingLabel: selected.label,
        estimatedDaysMin: selected.estimatedDaysMin,
        estimatedDaysMax: selected.estimatedDaysMax,
        shippingFee: selected.fee.toFixed(2),
        total: total.toFixed(2),
        status: "shipping_selected",
      },
    });

    await this.logUpdated(userId, updated.id, "shipping");
    return this.hydrateSession(updated);
  }

  async listShippingOptions(
    id: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ShippingOption[]> {
    const session = await this.loadAuthorizedSession(id, userId, sessionId);
    this.assertActive(session);

    const pincode = await this.resolvePincode(session);
    const methods = await this.prisma.shippingMethod.findMany({
      where: { isActive: true },
      include: { zones: true },
      orderBy: { sortOrder: "asc" },
    });

    const cartSummary = await this.cartService.getSummaryForCartId(session.cartId);
    const qualifiesFree =
      Number(cartSummary.shipping) === 0 ||
      cartSummary.appliedCoupons.some((c) => c.type === "free_shipping");

    return resolveShippingOptions({
      pincode,
      methods,
      freeShipping: qualifiesFree,
    }).map((o) => ({
      code: o.code,
      label: o.label,
      fee: o.fee.toFixed(2),
      estimatedDaysMin: o.estimatedDaysMin,
      estimatedDaysMax: o.estimatedDaysMax,
      serviceable: o.serviceable,
    }));
  }

  async updatePaymentMethod(
    id: string,
    paymentMethod: CheckoutPaymentMethod,
    userId?: string,
    sessionId?: string,
  ): Promise<CheckoutSession> {
    const session = await this.loadAuthorizedSession(id, userId, sessionId);
    this.assertActive(session);

    if (!session.shippingMethodCode) {
      throw new ValidationError("Select a delivery option before payment method");
    }

    const updated = await this.prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        paymentMethod,
        status: "payment_selected",
      },
    });

    await this.logUpdated(userId, updated.id, "payment_method");
    return this.hydrateSession(updated);
  }

  async review(id: string, userId?: string, sessionId?: string): Promise<CheckoutReviewResult> {
    const session = await this.loadAuthorizedSession(id, userId, sessionId);
    this.assertActive(session);

    const issues: string[] = [];
    if (!session.addressId && !session.guestAddress) issues.push("Delivery address is required");
    if (!session.shippingMethodCode) issues.push("Delivery option is required");
    if (!session.paymentMethod) issues.push("Payment method is required");

    const cartSummary = await this.cartService.getSummaryForCartId(session.cartId);
    const unavailable = cartSummary.items.filter((i) => !i.available);
    if (unavailable.length > 0) issues.push("Some items are no longer available");

    await this.revalidateCoupons(session.cartId, cartSummary);

    const recalculated = await this.recalculateTotals(session, cartSummary);
    const reviewValidAt = new Date(Date.now() + REVIEW_VALID_MINUTES * 60 * 1000);

    const updated = await this.prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        ...recalculated,
        reviewValidAt,
        status: issues.length === 0 ? "reviewed" : session.status,
        lineItemsSnapshot: cartSummary.items as unknown as Prisma.InputJsonValue,
        couponsSnapshot: cartSummary.appliedCoupons as unknown as Prisma.InputJsonValue,
      },
    });

    validateInventory(
      cartSummary.items.map((i) => ({ variantSku: i.variantSku, quantity: i.quantity })),
    );

    await this.logUpdated(userId, updated.id, "review");
    return {
      session: await this.hydrateSession(updated),
      valid: issues.length === 0,
      issues,
    };
  }

  async placeOrder(
    id: string,
    idempotencyKey: string,
    userId?: string,
    sessionId?: string,
  ): Promise<PreparedOrderResult> {
    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new ValidationError("Idempotency-Key header is required");
    }

    const session = await this.loadAuthorizedSession(id, userId, sessionId);

    const existing = await this.prisma.checkoutIdempotency.findUnique({
      where: { checkoutId_idempotencyKey: { checkoutId: id, idempotencyKey } },
    });
    if (existing) {
      return existing.response as unknown as PreparedOrderResult;
    }

    if (session.status === "order_prepared" && session.preparedOrderRef) {
      const result: PreparedOrderResult = {
        checkoutId: session.id,
        preparedOrderRef: session.preparedOrderRef,
        total: session.total.toString(),
        paymentMethod: session.paymentMethod!,
        message: "Order already prepared — proceed to payment in Sprint 8",
      };
      await this.storeIdempotency(id, idempotencyKey, result);
      return result;
    }

    this.assertActive(session);

    const review = await this.review(id, userId, sessionId);
    if (!review.valid) {
      throw new ValidationError(review.issues.join("; "));
    }

    preReserveInventory(session.id);
    const preparedOrderRef = randomUUID();

    const updated = await this.prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: "order_prepared",
        preparedOrderRef,
      },
    });

    const result: PreparedOrderResult = {
      checkoutId: updated.id,
      preparedOrderRef,
      total: updated.total.toString(),
      paymentMethod: updated.paymentMethod!,
      message: "Order prepared — payment execution arrives in Sprint 8",
    };

    await this.storeIdempotency(id, idempotencyKey, result);
    await this.auditService.log({
      userId,
      action: "CheckoutOrderPrepared",
      entityType: "checkout_session",
      entityId: updated.id,
      metadata: { preparedOrderRef },
    });

    return result;
  }

  private async storeIdempotency(
    checkoutId: string,
    idempotencyKey: string,
    response: PreparedOrderResult,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);
    try {
      await this.prisma.checkoutIdempotency.create({
        data: {
          checkoutId,
          idempotencyKey,
          response: response as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
      });
    } catch {
      throw new ConflictError("Duplicate idempotency key in progress");
    }
  }

  private async revalidateCoupons(cartId: string, cartSummary: Awaited<ReturnType<CartService["getSummaryForCartId"]>>) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: { coupons: true },
    });

    for (const cc of cart.coupons) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: cc.code } });
      if (!coupon) {
        await this.prisma.cartCoupon.delete({
          where: { cartId_code: { cartId, code: cc.code } },
        });
        throw new ValidationError(`Coupon ${cc.code} is no longer valid`);
      }
      validateCoupon(coupon, Number(cartSummary.subtotal));
    }
  }

  private async recalculateTotals(
    session: { subtotal: Prisma.Decimal; discount: Prisma.Decimal; shippingFee: Prisma.Decimal },
    cartSummary: Awaited<ReturnType<CartService["getSummaryForCartId"]>>,
  ) {
    const taxRules = await this.prisma.taxRule.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    });
    const taxRate = resolveActiveTaxRate(taxRules.map((r) => Number(r.rate)));
    const subtotal = Number(cartSummary.subtotal);
    const discount = Number(cartSummary.discount);
    const shipping = Number(session.shippingFee);
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = calculateTax({ taxableAmount: taxable, rate: taxRate });
    const total = taxable + shipping + taxAmount;

    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      shippingFee: shipping.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    };
  }

  private async resolvePincode(session: {
    addressId: string | null;
    guestAddress: Prisma.JsonValue | null;
  }): Promise<string> {
    if (session.addressId) {
      const address = await this.prisma.address.findUnique({ where: { id: session.addressId } });
      if (!address) throw new ValidationError("Selected address not found");
      return address.postalCode;
    }
    const guest = session.guestAddress as GuestAddressInput | null;
    if (!guest?.postalCode) throw new ValidationError("Delivery address is required");
    return guest.postalCode;
  }

  private validateGuestAddress(address: GuestAddressInput): void {
    const required: Array<keyof GuestAddressInput> = [
      "fullName",
      "phone",
      "line1",
      "city",
      "state",
      "postalCode",
      "country",
    ];
    for (const field of required) {
      if (!address[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }
    if (!/^\d{6}$/.test(address.postalCode)) {
      throw new ValidationError("postalCode must be 6 digits");
    }
  }

  private async loadAuthorizedSession(id: string, userId?: string, sessionId?: string) {
    const session = await this.prisma.checkoutSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundError("Checkout session not found");

    if (session.expiresAt < new Date() && session.status !== "order_prepared") {
      await this.prisma.checkoutSession.update({
        where: { id },
        data: { status: "expired" },
      });
      throw new ValidationError("Checkout session has expired");
    }

    if (userId && session.userId && session.userId !== userId) {
      throw new NotFoundError("Checkout session not found");
    }
    if (!userId && session.userId) {
      throw new ValidationError("Login required for this checkout session");
    }
    if (!userId && sessionId && session.sessionId && session.sessionId !== sessionId) {
      throw new NotFoundError("Checkout session not found");
    }

    return session;
  }

  private assertActive(session: { status: CheckoutStatus }): void {
    if (session.status === "expired" || session.status === "cancelled") {
      throw new ValidationError("Checkout session is no longer active");
    }
    if (session.status === "order_prepared") {
      throw new ValidationError("Checkout already completed");
    }
  }

  private async logUpdated(userId: string | undefined, checkoutId: string, step: string) {
    await this.auditService.log({
      userId,
      action: "CheckoutUpdated",
      entityType: "checkout_session",
      entityId: checkoutId,
      metadata: { step },
    });
  }

  private async hydrateSession(session: {
    id: string;
    cartId: string;
    status: CheckoutStatus;
    subtotal: Prisma.Decimal;
    discount: Prisma.Decimal;
    shippingFee: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    total: Prisma.Decimal;
    addressId: string | null;
    guestAddress: Prisma.JsonValue | null;
    shippingMethodCode: string | null;
    shippingLabel: string | null;
    estimatedDaysMin: number | null;
    estimatedDaysMax: number | null;
    paymentMethod: CheckoutPaymentMethod | null;
    lineItemsSnapshot: Prisma.JsonValue;
    couponsSnapshot: Prisma.JsonValue;
    reviewValidAt: Date | null;
    preparedOrderRef: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<CheckoutSession> {
    const items = session.lineItemsSnapshot as unknown as CheckoutSession["items"];
    const appliedCoupons = session.couponsSnapshot as unknown as CheckoutSession["appliedCoupons"];
    return this.toDto(session, items, appliedCoupons);
  }

  private async toDto(
    session: {
      id: string;
      cartId: string;
      status: CheckoutStatus;
      subtotal: Prisma.Decimal;
      discount: Prisma.Decimal;
      shippingFee: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      total: Prisma.Decimal;
      addressId: string | null;
      guestAddress: Prisma.JsonValue | null;
      shippingMethodCode: string | null;
      shippingLabel: string | null;
      estimatedDaysMin: number | null;
      estimatedDaysMax: number | null;
      paymentMethod: CheckoutPaymentMethod | null;
      reviewValidAt: Date | null;
      preparedOrderRef: string | null;
      expiresAt: Date;
      createdAt: Date;
      updatedAt: Date;
    },
    items: CheckoutSession["items"],
    appliedCoupons: CheckoutSession["appliedCoupons"],
  ): Promise<CheckoutSession> {
    let address: CheckoutAddress | null = null;

    if (session.addressId) {
      const saved = await this.prisma.address.findUnique({ where: { id: session.addressId } });
      if (saved) {
        address = {
          id: saved.id,
          label: saved.label,
          fullName: saved.fullName,
          phone: saved.phone,
          line1: saved.line1,
          line2: saved.line2,
          city: saved.city,
          state: saved.state,
          postalCode: saved.postalCode,
          country: saved.country,
          isDefault: saved.isDefault,
        };
      }
    } else if (session.guestAddress) {
      address = session.guestAddress as unknown as CheckoutAddress;
    }

    const shipping =
      session.shippingMethodCode && session.shippingLabel
        ? {
            code: session.shippingMethodCode,
            label: session.shippingLabel,
            fee: session.shippingFee.toString(),
            estimatedDaysMin: session.estimatedDaysMin ?? 0,
            estimatedDaysMax: session.estimatedDaysMax ?? 0,
            serviceable: true,
          }
        : null;

    return {
      id: session.id,
      cartId: session.cartId,
      status: session.status,
      items,
      appliedCoupons,
      address,
      shipping,
      paymentMethod: session.paymentMethod,
      pricing: {
        subtotal: session.subtotal.toString(),
        discount: session.discount.toString(),
        shipping: session.shippingFee.toString(),
        tax: session.taxAmount.toString(),
        total: session.total.toString(),
      },
      reviewValidAt: session.reviewValidAt?.toISOString() ?? null,
      preparedOrderRef: session.preparedOrderRef,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
