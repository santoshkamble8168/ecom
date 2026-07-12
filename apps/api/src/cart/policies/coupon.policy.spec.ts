import { validateCoupon, calculateCartTotals } from "./coupon.policy";

describe("coupon.policy", () => {
  const baseCoupon = {
    id: "c1",
    code: "WELCOME10",
    type: "percent" as const,
    value: 10,
    minCartValue: null,
    maxUses: null,
    usedCount: 0,
    expiresAt: null,
    isActive: true,
    createdAt: new Date(),
  };

  it("calculates percent discount", () => {
    const result = validateCoupon(baseCoupon as never, 1000);
    expect(result.discountAmount).toBe(100);
  });

  it("rejects expired coupon", () => {
    expect(() =>
      validateCoupon(
        { ...baseCoupon, expiresAt: new Date("2020-01-01") } as never,
        1000,
        new Date("2025-01-01"),
      ),
    ).toThrow("expired");
  });

  it("calculates shipping and free-shipping threshold", () => {
    const totals = calculateCartTotals({ subtotal: 500, coupons: [] });
    expect(totals.shipping).toBe(49);
    expect(totals.amountToFreeShipping).toBe(499);
  });

  it("waives shipping above threshold", () => {
    const totals = calculateCartTotals({ subtotal: 1000, coupons: [] });
    expect(totals.shipping).toBe(0);
  });
});
