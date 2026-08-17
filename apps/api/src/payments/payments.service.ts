import type {
  CodConfirmationResult,
  OrderConfirmation,
  PaymentSummary,
  RazorpayMockCaptureResult,
  RefundSummary,
} from "@ecom/types";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import type { Payment, PaymentStatus, Prisma, RefundRequest } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { AuditService } from "../audit/audit.service";
import { InventoryService } from "../inventory/inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { PromotionsService } from "../promotions/promotions.service";

import {
  assertCodEligible,
  canRetryPayment,
  generateOrderNumber,
  PAYMENT_EXPIRY_MINUTES,
  toPaise,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "./policies/payment.policy";
import { RazorpayProvider } from "./razorpay.provider";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayProvider,
    private readonly auditService: AuditService,
    private readonly inventoryService: InventoryService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async initiate(
    checkoutId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<PaymentSummary> {
    if (!userId) {
      throw new UnauthorizedError("Login required to pay for your order");
    }

    const checkout = await this.loadCheckout(checkoutId, userId, sessionId);
    if (checkout.status !== "order_prepared" && checkout.status !== "reviewed") {
      throw new ValidationError("Checkout must be reviewed before payment");
    }
    if (!checkout.paymentMethod) {
      throw new ValidationError("Payment method is required");
    }

    if (checkout.status === "reviewed") {
      // Ensure prepared ref exists for payment linkage
      await this.prisma.checkoutSession.update({
        where: { id: checkout.id },
        data: {
          status: "order_prepared",
          preparedOrderRef: checkout.preparedOrderRef ?? randomUUID(),
        },
      });
    }

    const existingOpen = await this.prisma.payment.findFirst({
      where: {
        checkoutId,
        status: { in: ["created", "pending", "authorized"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existingOpen) {
      return this.toPaymentSummary(existingOpen);
    }

    if (checkout.paymentMethod === "cod") {
      throw new ValidationError("Cash on Delivery is not available. Please pay online.");
    }
    return this.createRazorpayPayment(checkout, userId);
  }

  async getById(id: string, userId?: string, sessionId?: string): Promise<PaymentSummary> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundError("Payment not found");
    await this.loadCheckout(payment.checkoutId, userId, sessionId);
    return this.toPaymentSummary(payment);
  }

  async confirmCod(
    _checkoutId: string,
    _userId?: string,
    _sessionId?: string,
  ): Promise<CodConfirmationResult> {
    throw new ValidationError("Cash on Delivery is not available. Please pay online.");
  }

  async retry(paymentId: string, userId?: string, sessionId?: string): Promise<PaymentSummary> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment not found");
    await this.loadCheckout(payment.checkoutId, userId, sessionId);

    if (!canRetryPayment(payment.status, payment.attemptCount)) {
      throw new ValidationError("Payment cannot be retried");
    }

    if (payment.method === "cod") {
      return this.confirmCod(payment.checkoutId, userId, sessionId).then((r) => r.payment);
    }

    const checkout = await this.prisma.checkoutSession.findUniqueOrThrow({
      where: { id: payment.checkoutId },
    });
    const razorpayOrder = await this.razorpay.createOrder({
      amount: Number(checkout.total),
      currency: "INR",
      receipt: payment.reference,
    });

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "pending",
        providerOrderId: razorpayOrder.providerOrderId,
        failureCode: null,
        failureMessage: null,
        attemptCount: { increment: 1 },
        expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000),
        metadata: {
          ...(typeof payment.metadata === "object" && payment.metadata
            ? (payment.metadata as object)
            : {}),
          razorpay: razorpayOrder,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: "pending",
        providerOrderId: razorpayOrder.providerOrderId,
        rawResponse: razorpayOrder as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toPaymentSummary(updated);
  }

  /** Dev/mock capture — simulates successful Razorpay payment without redirect. */
  async mockCapture(
    paymentId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<RazorpayMockCaptureResult> {
    if (!this.razorpay.isMockMode()) {
      throw new ValidationError("Mock capture is only available in mock mode");
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment not found");
    const checkout = await this.loadCheckout(payment.checkoutId, userId, sessionId);

    if (payment.method !== "razorpay") {
      throw new ValidationError("Mock capture is only for Razorpay payments");
    }

    const providerPaymentId = `pay_mock_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
    const order = await this.finalizeOrder(checkout, payment.id, "razorpay");

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "captured",
        providerPaymentId,
        orderId: order.id,
        capturedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    await this.prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: "captured",
        providerOrderId: payment.providerOrderId,
        providerPaymentId,
        rawResponse: { mock: true },
      },
    });

    await this.clearCart(checkout.cartId);
    await this.recordSettlement(payment.id, "razorpay", Number(updated.amount));
    await this.auditService.log({
      userId,
      action: "OrderPaymentConfirmed",
      entityType: "payment",
      entityId: payment.id,
      metadata: { method: "razorpay", mock: true, orderId: order.id },
    });

    return {
      payment: this.toPaymentSummary(updated),
      order: this.toOrderConfirmation(order, "captured"),
    };
  }

  async confirmRazorpayClient(
    paymentId: string,
    params: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
    userId?: string,
    sessionId?: string,
  ): Promise<RazorpayMockCaptureResult> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment not found");
    const checkout = await this.loadCheckout(payment.checkoutId, userId, sessionId);

    const valid = verifyRazorpayPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
      secret: this.razorpay.getKeySecret(),
    });
    if (!valid) {
      await this.markFailed(payment.id, "invalid_signature", "Payment signature verification failed");
      throw new ValidationError("Invalid payment signature");
    }

    const order = await this.finalizeOrder(checkout, payment.id, "razorpay");
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "captured",
        providerOrderId: params.razorpayOrderId,
        providerPaymentId: params.razorpayPaymentId,
        orderId: order.id,
        capturedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    await this.clearCart(checkout.cartId);
    await this.recordSettlement(payment.id, "razorpay", Number(updated.amount));
    return {
      payment: this.toPaymentSummary(updated),
      order: this.toOrderConfirmation(order, "captured"),
    };
  }

  async handleRazorpayWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<{ received: boolean; processed: boolean }> {
    const signatureValid = verifyRazorpayWebhookSignature(
      rawBody,
      signature,
      this.razorpay.getWebhookSecret(),
    );

    let payload: {
      id?: string;
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; status?: string } };
        order?: { entity?: { id?: string; receipt?: string } };
      };
    };

    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      throw new ValidationError("Invalid webhook payload");
    }

    const eventId = payload.id ?? randomUUID();
    const eventType = payload.event ?? "unknown";

    const existing = await this.prisma.paymentWebhook.findUnique({
      where: { provider_eventId: { provider: "razorpay", eventId } },
    });
    if (existing?.processed) {
      return { received: true, processed: true };
    }

    if (!signatureValid && !this.razorpay.isMockMode()) {
      await this.prisma.paymentWebhook.create({
        data: {
          provider: "razorpay",
          eventId,
          eventType,
          signatureValid: false,
          processed: false,
          payload: payload as unknown as Prisma.InputJsonValue,
          errorMessage: "Invalid webhook signature",
        },
      });
      throw new ValidationError("Invalid webhook signature");
    }

    const providerPaymentId = payload.payload?.payment?.entity?.id;
    const providerOrderId =
      payload.payload?.payment?.entity?.order_id ?? payload.payload?.order?.entity?.id;

    const payment = providerOrderId
      ? await this.prisma.payment.findFirst({ where: { providerOrderId } })
      : null;

    const webhook = existing
      ? await this.prisma.paymentWebhook.update({
          where: { id: existing.id },
          data: {
            signatureValid,
            payload: payload as unknown as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.paymentWebhook.create({
          data: {
            provider: "razorpay",
            eventId,
            eventType,
            paymentId: payment?.id,
            signatureValid,
            payload: payload as unknown as Prisma.InputJsonValue,
          },
        });

    await this.auditService.log({
      action: "PaymentWebhookReceived",
      entityType: "payment_webhook",
      entityId: webhook.id,
      metadata: { eventType, signatureValid },
    });

    if (!payment) {
      await this.prisma.paymentWebhook.update({
        where: { id: webhook.id },
        data: { processed: true, processedAt: new Date(), errorMessage: "Payment not found" },
      });
      return { received: true, processed: false };
    }

    if (eventType.includes("captured") || payload.payload?.payment?.entity?.status === "captured") {
      if (payment.status !== "captured") {
        const checkout = await this.prisma.checkoutSession.findUniqueOrThrow({
          where: { id: payment.checkoutId },
        });
        const order = await this.finalizeOrder(checkout, payment.id, "razorpay");
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "captured",
            providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
            orderId: order.id,
            capturedAt: new Date(),
          },
        });
        await this.clearCart(checkout.cartId);
        await this.recordSettlement(payment.id, "razorpay", Number(payment.amount));
      }
    } else if (eventType.includes("failed")) {
      await this.markFailed(payment.id, "webhook_failed", "Payment failed via webhook");
    }

    await this.prisma.paymentWebhook.update({
      where: { id: webhook.id },
      data: { processed: true, processedAt: new Date(), paymentId: payment.id },
    });

    return { received: true, processed: true };
  }

  async getOrderConfirmation(
    orderNumber: string,
    userId?: string,
    sessionId?: string,
  ): Promise<OrderConfirmation> {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new NotFoundError("Order not found");

    if (userId && order.userId && order.userId !== userId) {
      throw new NotFoundError("Order not found");
    }
    if (!userId && sessionId && order.sessionId && order.sessionId !== sessionId) {
      throw new NotFoundError("Order not found");
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });

    return this.toOrderConfirmation(order, payment?.status ?? null);
  }

  private async createCodPayment(
    checkout: Awaited<ReturnType<PaymentsService["loadCheckout"]>>,
    userId?: string,
  ): Promise<PaymentSummary> {
    assertCodEligible(Number(checkout.total));
    const payment = await this.createCodPaymentRecord(checkout, userId);
    return this.toPaymentSummary(payment);
  }

  private async createCodPaymentRecord(
    checkout: Awaited<ReturnType<PaymentsService["loadCheckout"]>>,
    userId?: string,
  ) {
    const reference = `pay_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const payment = await this.prisma.payment.create({
      data: {
        reference,
        checkoutId: checkout.id,
        userId: userId ?? checkout.userId,
        provider: "cod",
        method: "cod",
        status: "pending",
        amount: checkout.total,
        expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await this.auditService.log({
      userId,
      action: "PaymentInitiated",
      entityType: "payment",
      entityId: payment.id,
      metadata: { method: "cod" },
    });

    return payment;
  }

  private async createRazorpayPayment(
    checkout: Awaited<ReturnType<PaymentsService["loadCheckout"]>>,
    userId?: string,
  ): Promise<PaymentSummary> {
    const reference = `pay_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const razorpayOrder = await this.razorpay.createOrder({
      amount: Number(checkout.total),
      currency: "INR",
      receipt: reference,
    });

    const payment = await this.prisma.payment.create({
      data: {
        reference,
        checkoutId: checkout.id,
        userId: userId ?? checkout.userId,
        provider: "razorpay",
        method: "razorpay",
        status: "pending",
        amount: checkout.total,
        providerOrderId: razorpayOrder.providerOrderId,
        expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000),
        metadata: { razorpay: razorpayOrder } as unknown as Prisma.InputJsonValue,
        attemptCount: 1,
      },
    });

    await this.prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: "pending",
        providerOrderId: razorpayOrder.providerOrderId,
        rawResponse: razorpayOrder as unknown as Prisma.InputJsonValue,
      },
    });

    await this.auditService.log({
      userId,
      action: "PaymentInitiated",
      entityType: "payment",
      entityId: payment.id,
      metadata: { method: "razorpay", mock: razorpayOrder.mock },
    });

    return this.toPaymentSummary(payment);
  }

  async adminCreateRefund(
    paymentId: string,
    amount: string | undefined,
    reason: string,
    adminId: string,
  ): Promise<RefundSummary> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment not found");
    if (!payment.orderId) throw new ValidationError("Payment is not linked to an order");
    if (payment.status !== "captured") {
      throw new ValidationError("Only captured payments can be refunded");
    }

    const refundAmount = amount ?? payment.amount.toString();
    if (Number(refundAmount) <= 0 || Number(refundAmount) > Number(payment.amount)) {
      throw new ValidationError("Refund amount must be greater than zero and not exceed the payment amount");
    }

    let providerRefundId: string | null = null;
    if (payment.provider === "razorpay" && payment.providerPaymentId) {
      const refund = await this.razorpay.refundPayment({
        providerPaymentId: payment.providerPaymentId,
        amountPaise: toPaise(Number(refundAmount)),
        notes: { reason },
      });
      providerRefundId = refund.providerRefundId;
    }

    const pending = await this.prisma.refundRequest.findFirst({
      where: { paymentId: payment.id, status: "pending" },
      orderBy: { initiatedAt: "asc" },
    });

    const refundRequest = pending
      ? await this.prisma.refundRequest.update({
          where: { id: pending.id },
          data: { amount: refundAmount, reason, status: "completed", providerRefundId, completedAt: new Date() },
        })
      : await this.prisma.refundRequest.create({
          data: {
            paymentId: payment.id,
            orderId: payment.orderId,
            amount: refundAmount,
            currency: payment.currency,
            reason,
            status: "completed",
            providerRefundId,
            completedAt: new Date(),
          },
        });

    const isFullRefund = Number(refundAmount) >= Number(payment.amount);
    if (isFullRefund) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "refunded" } });
    }

    await this.auditService.log({
      userId: adminId,
      action: "AdminRefundIssued",
      entityType: "payment",
      entityId: payment.id,
      metadata: { amount: refundAmount, reason, providerRefundId },
    });

    return this.toRefundSummary(refundRequest);
  }

  async listSettlements(paymentId: string) {
    const settlements = await this.prisma.settlement.findMany({
      where: { paymentId },
      orderBy: { createdAt: "desc" },
    });
    return settlements.map((s) => ({
      id: s.id,
      paymentId: s.paymentId,
      provider: s.provider,
      grossAmount: s.grossAmount.toString(),
      feeAmount: s.feeAmount.toString(),
      taxOnFee: s.taxOnFee.toString(),
      netAmount: s.netAmount.toString(),
      utr: s.utr,
      status: s.status,
      settledAt: s.settledAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async listRefunds(paymentId: string): Promise<RefundSummary[]> {
    const refunds = await this.prisma.refundRequest.findMany({
      where: { paymentId },
      orderBy: { initiatedAt: "desc" },
    });
    return refunds.map((r) => this.toRefundSummary(r));
  }

  private toRefundSummary(refund: RefundRequest): RefundSummary {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      amount: refund.amount.toString(),
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      providerRefundId: refund.providerRefundId,
      failureMessage: refund.failureMessage,
      initiatedAt: refund.initiatedAt.toISOString(),
      completedAt: refund.completedAt?.toISOString() ?? null,
    };
  }

  private async finalizeOrder(
    checkout: {
      id: string;
      cartId: string;
      userId: string | null;
      sessionId: string | null;
      subtotal: Prisma.Decimal;
      discount: Prisma.Decimal;
      shippingFee: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      total: Prisma.Decimal;
      paymentMethod: "razorpay" | "cod" | null;
      addressId: string | null;
      guestAddress: Prisma.JsonValue | null;
      lineItemsSnapshot: Prisma.JsonValue;
      couponsSnapshot: Prisma.JsonValue;
    },
    paymentId: string,
    method: "razorpay" | "cod",
  ) {
    const existing = await this.prisma.order.findUnique({ where: { checkoutId: checkout.id } });
    if (existing) {
      if (existing.status === "confirmed") return existing;
      return this.prisma.order.update({
        where: { id: existing.id },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          paymentMethod: method,
        },
      });
    }

    const address = await this.resolveAddress(checkout);
    let order;
    try {
      order = await this.prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          checkoutId: checkout.id,
          userId: checkout.userId,
          sessionId: checkout.sessionId,
          status: "confirmed",
          subtotal: checkout.subtotal,
          discount: checkout.discount,
          shippingFee: checkout.shippingFee,
          taxAmount: checkout.taxAmount,
          total: checkout.total,
          paymentMethod: method,
          shippingAddress: address as unknown as Prisma.InputJsonValue,
          lineItems: checkout.lineItemsSnapshot as Prisma.InputJsonValue,
          confirmedAt: new Date(),
        },
      });
    } catch {
      throw new ConflictError("Order already exists for this checkout");
    }

    // Turn the checkout's stock holds into a real sale, and record coupon
    // redemptions now that payment has actually succeeded. Both are
    // best-effort: a failure here shouldn't roll back a captured payment or
    // block the confirmation response, since stale holds self-heal via the
    // worker's expiry sweep and coupon usage is an audit trail, not a gate.
    await this.consumeReservationsForCheckout(checkout.id).catch((error: unknown) => {
      console.error(`Failed to consume stock reservations for checkout ${checkout.id}`, error);
    });
    await this.recordCouponUsagesForOrder(checkout.couponsSnapshot, order.id, checkout.userId, checkout.sessionId).catch(
      (error: unknown) => {
        console.error(`Failed to record coupon usage for order ${order.id}`, error);
      },
    );

    return order;
  }

  private async consumeReservationsForCheckout(checkoutId: string): Promise<void> {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { checkoutId, status: "active" },
    });
    for (const reservation of reservations) {
      try {
        await this.inventoryService.consumeReservation(reservation.id);
      } catch (error) {
        // The worker may have already expired/released this hold (e.g. a
        // slow payment gateway callback) — log and continue rather than
        // failing order confirmation over a stock bookkeeping race.
        console.error(`Failed to consume stock reservation ${reservation.id}`, error);
      }
    }
  }

  private async recordCouponUsagesForOrder(
    couponsSnapshot: Prisma.JsonValue,
    orderId: string,
    userId: string | null,
    sessionId: string | null,
  ): Promise<void> {
    const applied = Array.isArray(couponsSnapshot)
      ? (couponsSnapshot as unknown as Array<{ code: string; discountAmount: string }>)
      : [];
    if (applied.length === 0) return;

    for (const coupon of applied) {
      const record = await this.prisma.coupon.findUnique({ where: { code: coupon.code } });
      if (!record) continue;
      await this.promotionsService.recordCouponUsage(record.id, {
        userId: userId ?? undefined,
        sessionId: sessionId ?? undefined,
        orderId,
        discountAmount: Number(coupon.discountAmount),
      });
    }
  }

  private async resolveAddress(checkout: {
    addressId: string | null;
    guestAddress: Prisma.JsonValue | null;
  }) {
    if (checkout.addressId) {
      const address = await this.prisma.address.findUnique({ where: { id: checkout.addressId } });
      if (!address) throw new ValidationError("Shipping address not found");
      return {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      };
    }
    if (!checkout.guestAddress) throw new ValidationError("Shipping address is required");
    return checkout.guestAddress;
  }

  private async clearCart(cartId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cartId, savedForLater: false } });
    await this.prisma.cartCoupon.deleteMany({ where: { cartId } });
  }

  private async markFailed(paymentId: string, code: string, message: string) {
    // Note: the stock reservation from checkout is deliberately left active
    // on failure — `retry()` reuses the same checkout/reservation, so
    // releasing here would let stock sell out from under a shopper who's
    // about to retry. Abandoned holds still self-heal via the reservation's
    // own TTL and the worker's expiry sweep.
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "failed",
        failureCode: code,
        failureMessage: message,
        attemptCount: { increment: 1 },
      },
    });
    await this.prisma.paymentAttempt.create({
      data: {
        paymentId,
        status: "failed",
        errorMessage: message,
      },
    });
    await this.auditService.log({
      action: "PaymentFailed",
      entityType: "payment",
      entityId: paymentId,
      metadata: { code, message },
    });
  }

  private async loadCheckout(checkoutId: string, userId?: string, sessionId?: string) {
    const checkout = await this.prisma.checkoutSession.findUnique({ where: { id: checkoutId } });
    if (!checkout) throw new NotFoundError("Checkout session not found");

    if (checkout.expiresAt < new Date() && checkout.status !== "order_prepared") {
      throw new ValidationError("Checkout session has expired");
    }
    if (userId && checkout.userId && checkout.userId !== userId) {
      throw new NotFoundError("Checkout session not found");
    }
    if (!userId && checkout.userId) {
      throw new ValidationError("Login required for this checkout session");
    }
    if (!userId && sessionId && checkout.sessionId && checkout.sessionId !== sessionId) {
      throw new NotFoundError("Checkout session not found");
    }

    return checkout;
  }

  /**
   * Mock settlement ledger entry created at capture time. Real integrations would
   * instead ingest Razorpay's settlement reports/webhooks asynchronously (T+2 payout
   * cycle) — this synchronous mock keeps local/dev environments self-contained.
   */
  private async recordSettlement(paymentId: string, provider: "razorpay" | "cod", grossAmount: number): Promise<void> {
    if (provider !== "razorpay") return; // COD has no gateway settlement to reconcile
    const feeRate = 0.02;
    const gstRate = 0.18;
    const feeAmount = Math.round(grossAmount * feeRate * 100) / 100;
    const taxOnFee = Math.round(feeAmount * gstRate * 100) / 100;
    const netAmount = Math.round((grossAmount - feeAmount - taxOnFee) * 100) / 100;

    await this.prisma.settlement.create({
      data: {
        paymentId,
        provider: "razorpay",
        grossAmount,
        feeAmount,
        taxOnFee,
        netAmount,
        utr: `MOCKUTR${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`,
        status: "settled",
        settledAt: new Date(),
      },
    });
  }

  private toPaymentSummary(payment: Payment): PaymentSummary {
    const meta = payment.metadata as { razorpay?: PaymentSummary["razorpay"] } | null;
    return {
      id: payment.id,
      reference: payment.reference,
      checkoutId: payment.checkoutId,
      orderId: payment.orderId,
      provider: payment.provider,
      method: payment.method,
      status: payment.status,
      amount: payment.amount.toString(),
      currency: payment.currency,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      failureMessage: payment.failureMessage,
      attemptCount: payment.attemptCount,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
      capturedAt: payment.capturedAt?.toISOString() ?? null,
      razorpay: meta?.razorpay,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private toOrderConfirmation(
    order: {
      id: string;
      orderNumber: string;
      status: string;
      total: Prisma.Decimal;
      paymentMethod: "razorpay" | "cod";
      confirmedAt: Date | null;
      lineItems: Prisma.JsonValue;
    },
    paymentStatus: PaymentStatus | null,
  ): OrderConfirmation {
    const items = Array.isArray(order.lineItems) ? order.lineItems : [];
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as OrderConfirmation["status"],
      total: order.total.toString(),
      paymentMethod: order.paymentMethod,
      paymentStatus,
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      itemCount: items.length,
      message:
        order.paymentMethod === "cod"
          ? "Order confirmed — pay cash on delivery"
          : "Payment successful — order confirmed",
    };
  }
}
