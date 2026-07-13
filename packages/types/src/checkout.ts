import type { AppliedCartCoupon, CartLineItem } from "./cart";
import type { CustomerAddress } from "./customer";

export type CheckoutStatus =
  | "draft"
  | "address_selected"
  | "shipping_selected"
  | "payment_selected"
  | "reviewed"
  | "order_prepared"
  | "expired"
  | "cancelled";

export type CheckoutPaymentMethod = "razorpay" | "cod";

export interface CheckoutAddress extends Omit<CustomerAddress, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export interface ShippingOption {
  code: string;
  label: string;
  fee: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  serviceable: boolean;
}

export interface CheckoutPriceBreakdown {
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  total: string;
}

export interface CheckoutSession {
  id: string;
  cartId: string;
  status: CheckoutStatus;
  items: CartLineItem[];
  appliedCoupons: AppliedCartCoupon[];
  address: CheckoutAddress | null;
  shipping: ShippingOption | null;
  paymentMethod: CheckoutPaymentMethod | null;
  pricing: CheckoutPriceBreakdown;
  reviewValidAt: string | null;
  preparedOrderRef: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutReviewResult {
  session: CheckoutSession;
  valid: boolean;
  issues: string[];
}

export interface PreparedOrderResult {
  checkoutId: string;
  preparedOrderRef: string;
  total: string;
  paymentMethod: CheckoutPaymentMethod;
  message: string;
}
