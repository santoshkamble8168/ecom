import type { CartSummary, CartLineItem } from "@ecom/types";
import { NotFoundError, ValidationError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import type { CartItem, Coupon } from "@prisma/client";

import { productInclude, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { PrismaService } from "../prisma/prisma.service";

import {
  FREE_SHIPPING_THRESHOLD,
  calculateCartTotals,
  validateCoupon,
} from "./policies/coupon.policy";

const CART_TTL_DAYS = 30;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.resolveCart(userId, sessionId, false);
    if (!cart) return this.emptyCart();
    return this.buildSummary(cart.id);
  }

  async addItem(params: {
    productSlug: string;
    variantSku: string;
    quantity: number;
    userId?: string;
    sessionId?: string;
  }): Promise<CartSummary> {
    if (!params.userId && !params.sessionId) {
      throw new ValidationError("sessionId is required for guest cart");
    }

    const variant = await this.prisma.productVariant.findFirst({
      where: {
        sku: params.variantSku,
        isActive: true,
        product: { slug: params.productSlug, status: "published" },
      },
    });
    if (!variant) throw new NotFoundError("Variant not found or unavailable");

    const cart = await this.resolveCart(params.userId, params.sessionId, true);
    if (!cart) throw new ValidationError("Unable to resolve cart");
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantSku: params.variantSku,
        savedForLater: false,
      },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(10, existing.quantity + params.quantity) },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productSlug: params.productSlug,
          variantSku: params.variantSku,
          quantity: params.quantity,
        },
      });
    }

    return this.buildSummary(cart.id);
  }

  async updateItem(
    itemId: string,
    quantity: number,
    userId?: string,
    sessionId?: string,
  ): Promise<CartSummary> {
    const cart = await this.resolveCart(userId, sessionId, false);
    if (!cart) throw new NotFoundError("Cart not found");

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundError("Cart item not found");

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.buildSummary(cart.id);
  }

  async removeItem(itemId: string, userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.resolveCart(userId, sessionId, false);
    if (!cart) throw new NotFoundError("Cart not found");

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundError("Cart item not found");

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.buildSummary(cart.id);
  }

  async applyCoupon(code: string, userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.resolveCart(userId, sessionId, false);
    if (!cart) throw new NotFoundError("Cart not found");

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) throw new ValidationError("Invalid coupon code");

    const summary = await this.buildSummary(cart.id);
    const subtotal = Number(summary.subtotal);
    const validated = validateCoupon(coupon, subtotal);

    await this.prisma.cartCoupon.upsert({
      where: { cartId_code: { cartId: cart.id, code: coupon.code } },
      update: { discountAmount: validated.discountAmount },
      create: {
        cartId: cart.id,
        code: coupon.code,
        discountAmount: validated.discountAmount,
      },
    });

    return this.buildSummary(cart.id);
  }

  async removeCoupon(code: string, userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.resolveCart(userId, sessionId, false);
    if (!cart) throw new NotFoundError("Cart not found");

    await this.prisma.cartCoupon.deleteMany({
      where: { cartId: cart.id, code: code.toUpperCase() },
    });

    return this.buildSummary(cart.id);
  }

  async saveForLater(itemId: string, userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.resolveCart(userId, sessionId, false);
    if (!cart) throw new NotFoundError("Cart not found");

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id, savedForLater: false },
    });
    if (!item) throw new NotFoundError("Cart item not found");

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    await this.prisma.cartItem.upsert({
      where: {
        cartId_variantSku_savedForLater: {
          cartId: cart.id,
          variantSku: item.variantSku,
          savedForLater: true,
        },
      },
      update: { quantity: item.quantity },
      create: {
        cartId: cart.id,
        productSlug: item.productSlug,
        variantSku: item.variantSku,
        quantity: item.quantity,
        savedForLater: true,
      },
    });

    return this.buildSummary(cart.id);
  }

  async moveToCart(itemId: string, userId?: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.resolveCart(userId, sessionId, false);
    if (!cart) throw new NotFoundError("Cart not found");

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id, savedForLater: true },
    });
    if (!item) throw new NotFoundError("Saved item not found");

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantSku: item.variantSku, savedForLater: false },
    });
    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(10, existing.quantity + item.quantity) },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productSlug: item.productSlug,
          variantSku: item.variantSku,
          quantity: item.quantity,
          savedForLater: false,
        },
      });
    }

    return this.buildSummary(cart.id);
  }

  async merge(sessionId: string, userId: string): Promise<CartSummary> {
    const guestCart = await this.prisma.cart.findUnique({ where: { sessionId } });
    if (!guestCart) {
      return this.getCart(userId);
    }

    const userCart = await this.resolveCart(userId, undefined, true);
    if (!userCart) throw new ValidationError("Unable to resolve user cart");

    const guestItems = await this.prisma.cartItem.findMany({ where: { cartId: guestCart.id } });
    for (const item of guestItems) {
      const target = await this.prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          variantSku: item.variantSku,
          savedForLater: item.savedForLater,
        },
      });
      if (target) {
        await this.prisma.cartItem.update({
          where: { id: target.id },
          data: { quantity: Math.min(10, target.quantity + item.quantity) },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productSlug: item.productSlug,
            variantSku: item.variantSku,
            quantity: item.quantity,
            savedForLater: item.savedForLater,
          },
        });
      }
    }

    const guestCoupons = await this.prisma.cartCoupon.findMany({ where: { cartId: guestCart.id } });
    for (const coupon of guestCoupons) {
      await this.prisma.cartCoupon.upsert({
        where: { cartId_code: { cartId: userCart.id, code: coupon.code } },
        update: {},
        create: {
          cartId: userCart.id,
          code: coupon.code,
          discountAmount: coupon.discountAmount,
        },
      });
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });
    return this.buildSummary(userCart.id);
  }

  async moveWishlistToCart(
    wishlistItemId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<CartSummary> {
    const wishlistItem = await this.prisma.wishlistItem.findFirst({
      where: {
        id: wishlistItemId,
        ...(userId ? { userId } : { sessionId }),
      },
    });
    if (!wishlistItem) throw new NotFoundError("Wishlist item not found");
    if (!wishlistItem.variantSku) {
      throw new ValidationError("Select a variant on the product page before moving to cart");
    }

    const summary = await this.addItem({
      productSlug: wishlistItem.productSlug,
      variantSku: wishlistItem.variantSku,
      quantity: 1,
      userId,
      sessionId,
    });

    await this.prisma.wishlistItem.delete({ where: { id: wishlistItemId } });
    return summary;
  }

  async getSummaryForCartId(cartId: string): Promise<CartSummary> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundError("Cart not found");
    return this.buildSummary(cartId);
  }

  async findCart(userId?: string, sessionId?: string) {
    return this.resolveCart(userId, sessionId, false);
  }

  private async resolveCart(userId?: string, sessionId?: string, create = true) {
    if (!userId && !sessionId) return null;

    const expiresAt = new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);

    if (userId) {
      const existing = await this.prisma.cart.findUnique({ where: { userId } });
      if (existing) return existing;
      if (!create) return null;
      return this.prisma.cart.create({ data: { userId, expiresAt } });
    }

    const existing = await this.prisma.cart.findUnique({ where: { sessionId: sessionId! } });
    if (existing) return existing;
    if (!create) return null;
    return this.prisma.cart.create({ data: { sessionId: sessionId!, expiresAt } });
  }

  private async buildSummary(cartId: string): Promise<CartSummary> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: { items: true, coupons: true },
    });

    const activeItems = cart.items.filter((i) => !i.savedForLater);
    const savedItems = cart.items.filter((i) => i.savedForLater);

    const enrichedActive = await this.enrichItems(activeItems);
    const enrichedSaved = await this.enrichItems(savedItems);

    const subtotal = enrichedActive.reduce((sum, item) => sum + Number(item.lineTotal), 0);

    const couponRecords = await this.prisma.coupon.findMany({
      where: { code: { in: cart.coupons.map((c) => c.code) } },
    });
    const couponMap = new Map(couponRecords.map((c) => [c.code, c]));

    const appliedCoupons = cart.coupons.map((cc) => {
      const coupon = couponMap.get(cc.code);
      return {
        code: cc.code,
        discountAmount: cc.discountAmount.toString(),
        type: (coupon?.type ?? "fixed") as "percent" | "fixed" | "free_shipping",
      };
    });

    const totals = calculateCartTotals({
      subtotal,
      coupons: appliedCoupons.map((c) => ({
        type: c.type,
        discountAmount: Number(c.discountAmount),
      })),
    });

    return {
      id: cart.id,
      items: enrichedActive,
      savedForLater: enrichedSaved,
      subtotal: subtotal.toFixed(2),
      discount: totals.discount.toFixed(2),
      shipping: totals.shipping.toFixed(2),
      total: totals.total.toFixed(2),
      appliedCoupons,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      amountToFreeShipping: totals.amountToFreeShipping.toFixed(2),
      itemCount: enrichedActive.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  private async enrichItems(items: CartItem[]): Promise<CartLineItem[]> {
    if (items.length === 0) return [];

    const slugs = [...new Set(items.map((i) => i.productSlug))];
    const skus = [...new Set(items.map((i) => i.variantSku))];

    const products = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, status: "published" },
      include: productInclude,
    });
    const variants = await this.prisma.productVariant.findMany({
      where: { sku: { in: skus } },
      include: {
        options: { include: { attributeValue: { include: { attribute: true } } } },
      },
    });

    const productMap = new Map(products.map((p) => [p.slug, toProductSummary(p)]));
    const variantMap = new Map(variants.map((v) => [v.sku, v]));

    return items.map((item) => {
      const variant = variantMap.get(item.variantSku);
      const unitPrice = variant ? Number(variant.price) : 0;
      const variantLabel = variant
        ? variant.options.map((o) => o.attributeValue.value).join(" / ")
        : null;

      return {
        id: item.id,
        productSlug: item.productSlug,
        variantSku: item.variantSku,
        quantity: item.quantity,
        savedForLater: item.savedForLater,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: (unitPrice * item.quantity).toFixed(2),
        product: productMap.get(item.productSlug) ?? null,
        variantLabel,
        available: Boolean(variant?.isActive),
      };
    });
  }

  private emptyCart(): CartSummary {
    return {
      id: "",
      items: [],
      savedForLater: [],
      subtotal: "0.00",
      discount: "0.00",
      shipping: "0.00",
      total: "0.00",
      appliedCoupons: [],
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      amountToFreeShipping: FREE_SHIPPING_THRESHOLD.toFixed(2),
      itemCount: 0,
    };
  }
}
