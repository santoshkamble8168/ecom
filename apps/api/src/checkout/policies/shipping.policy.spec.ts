import { resolveShippingOptions, selectShippingOption } from "./shipping.policy";

const methods = [
  {
    id: "1",
    code: "standard",
    label: "Standard Delivery",
    baseFee: "49",
    estimatedDaysMin: 4,
    estimatedDaysMax: 7,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    zones: [
      {
        id: "z1",
        name: "All India",
        pincodePrefixes: ["11", "40", "56", "99"],
        shippingMethodId: "1",
        feeOverride: null,
        isServiceable: true,
        createdAt: new Date(),
      },
    ],
  },
  {
    id: "2",
    code: "express",
    label: "Express Delivery",
    baseFee: "99",
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    zones: [
      {
        id: "z2",
        name: "Metro",
        pincodePrefixes: ["11", "40"],
        shippingMethodId: "2",
        feeOverride: null,
        isServiceable: true,
        createdAt: new Date(),
      },
    ],
  },
] as const;

describe("shipping.policy", () => {
  it("returns serviceable options for metro pincode", () => {
    const options = resolveShippingOptions({
      pincode: "110001",
      methods: [...methods],
      freeShipping: false,
    });
    expect(options).toHaveLength(2);
    expect(options[0]?.code).toBe("standard");
  });

  it("waives shipping fee when free shipping applies", () => {
    const options = resolveShippingOptions({
      pincode: "110001",
      methods: [...methods],
      freeShipping: true,
    });
    expect(options.every((o) => o.fee === 0)).toBe(true);
  });

  it("rejects unavailable shipping code", () => {
    const options = resolveShippingOptions({
      pincode: "560001",
      methods: [...methods],
      freeShipping: false,
    });
    expect(() => selectShippingOption(options, "express")).toThrow(
      "Selected shipping method is not available",
    );
  });
});
