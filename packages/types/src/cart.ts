import type { ProductSummary } from "./catalog";

export interface CartLineItem {
  id: string;
  productSlug: string;
  variantSku: string;
  quantity: number;
  savedForLater: boolean;
  unitPrice: string;
  lineTotal: string;
  product: ProductSummary | null;
  variantLabel: string | null;
  available: boolean;
}

export interface AppliedCartCoupon {
  code: string;
  discountAmount: string;
  type: "percent" | "fixed" | "free_shipping";
}

export interface CartSummary {
  id: string;
  items: CartLineItem[];
  savedForLater: CartLineItem[];
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  appliedCoupons: AppliedCartCoupon[];
  freeShippingThreshold: number;
  amountToFreeShipping: string;
  itemCount: number;
}

export interface CouponValidationResult {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  discountAmount: string;
  message: string;
}
