import { DEFAULT_GST_RATE, calculateTax } from "./tax.policy";

describe("tax.policy", () => {
  it("calculates GST on taxable amount", () => {
    expect(calculateTax({ taxableAmount: 1000, rate: 0.05 })).toBe(50);
  });

  it("uses default rate when not provided", () => {
    expect(calculateTax({ taxableAmount: 200 })).toBe(10);
    expect(DEFAULT_GST_RATE).toBe(0.05);
  });
});
