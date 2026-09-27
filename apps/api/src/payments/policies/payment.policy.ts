import { createHmac, timingSafeEqual } from "node:crypto";

import { ValidationError } from "@ecom/shared";

export const PAYMENT_EXPIRY_MINUTES = Number(process.env.PAYMENT_EXPIRY_MINUTES ?? 30);
export const PAYMENT_MAX_RETRIES = Number(process.env.PAYMENT_MAX_RETRIES ?? 3);
export const COD_MAX_ORDER_VALUE = Number(process.env.COD_MAX_ORDER_VALUE ?? 15000);
const PAYABLE_STATUSES = new Set(["created", "pending", "authorized"]);

export function razorpayMode(): string {
  return process.env.RAZORPAY_MODE ?? "mock";
}

/** Mock capture is local development only. Missing keys never force mock mode. */
export function isRazorpayMockMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return razorpayMode() === "mock";
}

export function assertPaymentPayable(status: string): void {
  if (!PAYABLE_STATUSES.has(status)) {
    throw new ValidationError("Payment is no longer payable");
  }
}

export function assertRazorpayOrderBound(storedOrderId: string | null, claimedOrderId: string): void {
  if (!storedOrderId || storedOrderId !== claimedOrderId) {
    throw new ValidationError("Payment does not match this order");
  }
}

export function razorpayAmountMatches(localAmount: number, amountPaise: number): boolean {
  return Number.isInteger(amountPaise) && toPaise(localAmount) === amountPaise;
}

export function assertCodEligible(amount: number): void {
  if (amount <= 0) {
    throw new ValidationError("Invalid COD amount");
  }
  if (amount > COD_MAX_ORDER_VALUE) {
    throw new ValidationError(`COD is not available for orders above ₹${COD_MAX_ORDER_VALUE}`);
  }
}

export function canRetryPayment(status: string, attemptCount: number): boolean {
  if (attemptCount >= PAYMENT_MAX_RETRIES) return false;
  return status === "failed" || status === "cancelled" || status === "created" || status === "pending";
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const payload = `${params.orderId}|${params.paymentId}`;
  const expected = createHmac("sha256", params.secret).update(payload).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(params.signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function toPaise(amount: number): number {
  return Math.round(amount * 100);
}

export function generateOrderNumber(now = new Date()): string {
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `ECO${y}${m}${d}${rand}`;
}
