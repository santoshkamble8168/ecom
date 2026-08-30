import {
  computeFunnel,
  funnelStepForEvent,
  isAnalyticsEventName,
  sanitizeAnalyticsProperties,
  shouldSample,
} from "./analytics";

describe("analytics helpers", () => {
  it("allowlists event names", () => {
    expect(isAnalyticsEventName("page_view")).toBe(true);
    expect(isAnalyticsEventName("recommendation_view")).toBe(true);
    expect(isAnalyticsEventName("hack")).toBe(false);
  });

  it("strips secrets and non-scalars from properties", () => {
    const clean = sanitizeAnalyticsProperties({
      productSlug: "classic-tee",
      email: "ada@example.com",
      otpCode: "123456",
      nested: { a: 1 },
      views: 3,
    });
    expect(clean).toEqual({ productSlug: "classic-tee", views: 3 });
  });

  it("samples deterministically by session id", () => {
    expect(shouldSample("abc", 1)).toBe(true);
    expect(shouldSample("abc", 0)).toBe(false);
    expect(shouldSample("abc", 0.5)).toBe(shouldSample("abc", 0.5));
  });

  it("maps events onto sequential funnel steps", () => {
    expect(funnelStepForEvent("page_view", "/")).toBe("homepage");
    expect(funnelStepForEvent("page_view", "/men")).toBe("plp");
    expect(funnelStepForEvent("product_view")).toBe("pdp");
    expect(funnelStepForEvent("search")).toBeNull();
  });

  it("requires earlier funnel steps before counting later ones", () => {
    const steps = computeFunnel([
      { sessionId: "s1", step: "homepage", occurredAt: 1 },
      { sessionId: "s1", step: "plp", occurredAt: 2 },
      { sessionId: "s1", step: "pdp", occurredAt: 3 },
      { sessionId: "s2", step: "order", occurredAt: 1 },
    ]);
    expect(steps.find((step) => step.key === "homepage")?.sessions).toBe(1);
    expect(steps.find((step) => step.key === "pdp")?.sessions).toBe(1);
    expect(steps.find((step) => step.key === "order")?.sessions).toBe(0);
  });
});
