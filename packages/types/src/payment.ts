export type PaymentStatus =
  | "created"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentProvider = "razorpay" | "cod";

export type OrderStatus = "pending_payment" | "confirmed" | "cancelled" | "failed";

export interface PaymentSummary {
  id: string;
  reference: string;
  checkoutId: string;
  orderId: string | null;
  provider: PaymentProvider;
  method: "razorpay" | "cod";
  status: PaymentStatus;
  amount: string;
  currency: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  failureMessage: string | null;
  attemptCount: number;
  expiresAt: string | null;
  capturedAt: string | null;
  razorpay?: {
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: string;
    mock: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderConfirmation {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
  paymentMethod: "razorpay" | "cod";
  paymentStatus: PaymentStatus | null;
  confirmedAt: string | null;
  itemCount: number;
  message: string;
}

export interface CodConfirmationResult {
  payment: PaymentSummary;
  order: OrderConfirmation;
}

export interface RazorpayMockCaptureResult {
  payment: PaymentSummary;
  order: OrderConfirmation;
}
