import { resolveEffectivePrice, resolveTaxRate } from "./price-resolution.policy";

describe("resolveEffectivePrice", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  it("returns the sale price when now is within the sale window", () => {
    const result = resolveEffectivePrice(
      {
        sellingPrice: "999.00",
        salePrice: "799.00",
        saleStartsAt: new Date("2026-06-01T00:00:00Z"),
        saleEndsAt: new Date("2026-06-30T00:00:00Z"),
      },
      now,
    );

    expect(result).toEqual({ effectivePrice: "799.00", saleActive: true });
  });

  it("returns the selling price before the sale window starts", () => {
    const result = resolveEffectivePrice(
      {
        sellingPrice: "999.00",
        salePrice: "799.00",
        saleStartsAt: new Date("2026-07-01T00:00:00Z"),
        saleEndsAt: new Date("2026-07-30T00:00:00Z"),
      },
      now,
    );

    expect(result).toEqual({ effectivePrice: "999.00", saleActive: false });
  });

  it("returns the selling price after the sale window ends", () => {
    const result = resolveEffectivePrice(
      {
        sellingPrice: "999.00",
        salePrice: "799.00",
        saleStartsAt: new Date("2026-05-01T00:00:00Z"),
        saleEndsAt: new Date("2026-05-30T00:00:00Z"),
      },
      now,
    );

    expect(result).toEqual({ effectivePrice: "999.00", saleActive: false });
  });

  it("returns the selling price when no sale is configured", () => {
    const result = resolveEffectivePrice(
      { sellingPrice: "999.00", salePrice: null, saleStartsAt: null, saleEndsAt: null },
      now,
    );

    expect(result).toEqual({ effectivePrice: "999.00", saleActive: false });
  });

  it("treats a missing start bound as unbounded (sale active if before end)", () => {
    const result = resolveEffectivePrice(
      {
        sellingPrice: "999.00",
        salePrice: "799.00",
        saleStartsAt: null,
        saleEndsAt: new Date("2026-06-30T00:00:00Z"),
      },
      now,
    );

    expect(result).toEqual({ effectivePrice: "799.00", saleActive: true });
  });

  it("treats a missing end bound as unbounded (sale active if after start)", () => {
    const result = resolveEffectivePrice(
      {
        sellingPrice: "999.00",
        salePrice: "799.00",
        saleStartsAt: new Date("2026-06-01T00:00:00Z"),
        saleEndsAt: null,
      },
      now,
    );

    expect(result).toEqual({ effectivePrice: "799.00", saleActive: true });
  });

  it("accepts Decimal-like values (objects with toString)", () => {
    const decimalLike = { toString: () => "849.00" } as unknown as string;
    const result = resolveEffectivePrice(
      { sellingPrice: decimalLike, salePrice: null, saleStartsAt: null, saleEndsAt: null },
      now,
    );

    expect(result.effectivePrice).toBe("849.00");
  });
});

describe("resolveTaxRate", () => {
  it("returns 0 when there are no rules", () => {
    expect(resolveTaxRate([], "cat-1")).toBe(0);
  });

  it("returns 0 when no rule matches the category and there is no sitewide fallback", () => {
    const rules = [{ rate: "0.05", categoryId: "cat-other", priority: 0, isActive: true }];
    expect(resolveTaxRate(rules, "cat-1")).toBe(0);
  });

  it("ignores inactive rules", () => {
    const rules = [{ rate: "0.18", categoryId: null, priority: 0, isActive: false }];
    expect(resolveTaxRate(rules, null)).toBe(0);
  });

  it("falls back to the sitewide rule when no category-specific rule matches", () => {
    const rules = [
      { rate: "0.05", categoryId: null, priority: 0, isActive: true },
      { rate: "0.12", categoryId: "cat-other", priority: 5, isActive: true },
    ];
    expect(resolveTaxRate(rules, "cat-1")).toBe(0.05);
  });

  it("prefers a category-specific rule over the sitewide fallback", () => {
    const rules = [
      { rate: "0.05", categoryId: null, priority: 10, isActive: true },
      { rate: "0.18", categoryId: "cat-1", priority: 0, isActive: true },
    ];
    expect(resolveTaxRate(rules, "cat-1")).toBe(0.18);
  });

  it("picks the highest-priority rule among multiple matches for the same category", () => {
    const rules = [
      { rate: "0.05", categoryId: "cat-1", priority: 1, isActive: true },
      { rate: "0.18", categoryId: "cat-1", priority: 10, isActive: true },
      { rate: "0.12", categoryId: "cat-1", priority: 5, isActive: true },
    ];
    expect(resolveTaxRate(rules, "cat-1")).toBe(0.18);
  });

  it("returns 0 when categoryId is null and there is no sitewide rule", () => {
    const rules = [{ rate: "0.18", categoryId: "cat-1", priority: 0, isActive: true }];
    expect(resolveTaxRate(rules, null)).toBe(0);
  });

  it("accepts numeric rate values", () => {
    const rules = [{ rate: 0.05, categoryId: null, priority: 0, isActive: true }];
    expect(resolveTaxRate(rules, null)).toBe(0.05);
  });
});
