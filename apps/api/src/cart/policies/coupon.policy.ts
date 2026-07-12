import type { Coupon } from "@prisma/client";
import { ValidationError } from "@ecom/shared";

export const FREE_SHIPPING_THRESHOLD = 999;
const BASE_SHIPPING_FEE = 49;

export interface CouponDiscount {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  discountAmount: number;
  message: string;
}

export function validateCoupon(
  coupon: Coupon,
  subtotal: number,
  now = new Date(),
): CouponDiscount {
  if (!coupon.isActive) {
    throw new ValidationError("This coupon is not active");
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new ValidationError("This coupon has expired");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new ValidationError("This coupon has reached its usage limit");
  }
  if (coupon.minCartValue !== null && subtotal < Number(coupon.minCartValue)) {
    throw new ValidationError(
      `Minimum cart value of ₹${Number(coupon.minCartValue)} required for this coupon`,
    );
  }

  let discountAmount = 0;
  let message = "";

  switch (coupon.type) {
    case "percent":
      discountAmount = Math.round(subtotal * (Number(coupon.value) / 100));
      message = `${coupon.value}% off applied`;
      break;
    case "fixed":
      discountAmount = Math.min(subtotal, Number(coupon.value));
      message = `₹${coupon.value} off applied`;
      break;
    case "free_shipping":
      discountAmount = 0;
      message = "Free shipping applied";
      break;
    default:
      throw new ValidationError("Unsupported coupon type");
  }

  return {
    code: coupon.code,
    type: coupon.type,
    discountAmount,
    message,
  };
}

export function calculateCartTotals(params: {
  subtotal: number;
  coupons: Array<{ type: string; discountAmount: number }>;
}): { discount: number; shipping: number; total: number; amountToFreeShipping: number } {
  const { subtotal, coupons } = params;
  const hasFreeShippingCoupon = coupons.some((c) => c.type === "free_shipping");
  const discount = coupons
    .filter((c) => c.type !== "free_shipping")
    .reduce((sum, c) => sum + c.discountAmount, 0);

  const afterDiscount = Math.max(0, subtotal - discount);
  const qualifiesForFreeShipping = afterDiscount >= FREE_SHIPPING_THRESHOLD || hasFreeShippingCoupon;
  const shipping = qualifiesForFreeShipping ? 0 : BASE_SHIPPING_FEE;
  const total = afterDiscount + shipping;
  const amountToFreeShipping = qualifiesForFreeShipping
    ? 0
    : Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount);

  return { discount, shipping, total, amountToFreeShipping };
}
