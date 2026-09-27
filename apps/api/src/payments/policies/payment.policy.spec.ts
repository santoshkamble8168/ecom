import {
  assertCodEligible,
  assertPaymentPayable,
  assertRazorpayOrderBound,
  canRetryPayment,
  generateOrderNumber,
  isRazorpayMockMode,
  razorpayAmountMatches,
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
    const previous = process.env.RAZORPAY_MODE;
    delete process.env.RAZORPAY_MODE;
    expect(razorpayMode()).toBe("mock");
    if (previous === undefined) delete process.env.RAZORPAY_MODE;
    else process.env.RAZORPAY_MODE = previous;
  });

  it("treats mock mode as local development only", () => {
    const previousNode = process.env.NODE_ENV;
    const previousMode = process.env.RAZORPAY_MODE;
    const previousKey = process.env.RAZORPAY_KEY_ID;

    process.env.NODE_ENV = "development";
    delete process.env.RAZORPAY_MODE;
    delete process.env.RAZORPAY_KEY_ID;
    expect(isRazorpayMockMode()).toBe(true);

    process.env.RAZORPAY_MODE = "test";
    expect(isRazorpayMockMode()).toBe(false);

    process.env.NODE_ENV = "production";
    process.env.RAZORPAY_MODE = "mock";
    expect(isRazorpayMockMode()).toBe(false);

    if (previousNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNode;
    if (previousMode === undefined) delete process.env.RAZORPAY_MODE;
    else process.env.RAZORPAY_MODE = previousMode;
    if (previousKey === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = previousKey;
  });

  it("rejects a confirm that is not payable or bound to the stored order", () => {
    expect(() => assertPaymentPayable("captured")).toThrow("no longer payable");
    expect(() => assertPaymentPayable("pending")).not.toThrow();
    expect(() => assertRazorpayOrderBound(null, "order_cheap")).toThrow("does not match");
    expect(() => assertRazorpayOrderBound("order_real", "order_cheap")).toThrow("does not match");
    expect(() => assertRazorpayOrderBound("order_real", "order_real")).not.toThrow();
  });

  it("matches Razorpay paise to the local amount", () => {
    expect(razorpayAmountMatches(499.5, 49950)).toBe(true);
    expect(razorpayAmountMatches(499.5, 100)).toBe(false);
  });

  it("reads payment expiry minutes", () => {
    expect(PAYMENT_EXPIRY_MINUTES).toBeGreaterThan(0);
  });
});
