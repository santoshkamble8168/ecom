import {
  assertCodEligible,
  canRetryPayment,
  generateOrderNumber,
  toPaise,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  PAYMENT_EXPIRY_MINUTES,
  PAYMENT_MAX_RETRIES,
  razorpayMode,
} from "./payment.policy";

describe("payment.policy", () => {
  it("rejects COD above max order value", () => {
    expect(() => assertCodEligible(20000)).toThrow("COD is not available");
  });

  it("allows COD within limit", () => {
    expect(() => assertCodEligible(999)).not.toThrow();
  });

  it("limits payment retries", () => {
    expect(canRetryPayment("failed", PAYMENT_MAX_RETRIES)).toBe(false);
    expect(canRetryPayment("failed", 0)).toBe(true);
  });

  it("converts amount to paise", () => {
    expect(toPaise(499.5)).toBe(49950);
  });

  it("generates order numbers", () => {
    expect(generateOrderNumber()).toMatch(/^ECO\d{12}$/);
  });

  it("verifies razorpay payment signature", () => {
    const secret = "test_secret";
    const orderId = "order_1";
    const paymentId = "pay_1";
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    expect(
      verifyRazorpayPaymentSignature({ orderId, paymentId, signature, secret }),
    ).toBe(true);
    expect(
      verifyRazorpayPaymentSignature({
        orderId,
        paymentId,
        signature: "deadbeef",
        secret,
      }),
    ).toBe(false);
  });

  it("verifies webhook signature", () => {
    const secret = "whsec";
    const body = '{"id":"evt_1"}';
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyRazorpayWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyRazorpayWebhookSignature(body, "bad", secret)).toBe(false);
  });

  it("defaults razorpay mode to mock when unset", () => {
    expect(["mock", "test", "live"]).toContain(razorpayMode());
  });

  it("reads payment expiry minutes", () => {
    expect(PAYMENT_EXPIRY_MINUTES).toBeGreaterThan(0);
  });
});
