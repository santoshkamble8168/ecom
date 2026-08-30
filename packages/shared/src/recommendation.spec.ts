import {
  defaultSlotConfig,
  isRecommendationSlot,
  isRecommendationStrategy,
  resolveSearchMode,
  shouldRecordSemanticRequest,
} from "./recommendation";

describe("recommendation helpers", () => {
  it("allowlists known slots and strategies", () => {
    expect(isRecommendationSlot("homepage_trending")).toBe(true);
    expect(isRecommendationSlot("vector-slot")).toBe(false);
    expect(isRecommendationStrategy("similar")).toBe(true);
    expect(isRecommendationStrategy("embeddings")).toBe(false);
  });

  it("returns seeded defaults for a known slot", () => {
    const config = defaultSlotConfig("pdp_similar");
    expect(config.strategy).toBe("similar");
    expect(config.isEnabled).toBe(true);
  });

  it("never switches search off keyword until a vector provider exists", () => {
    expect(resolveSearchMode("semantic", true)).toBe("keyword");
    expect(resolveSearchMode("keyword", false)).toBe("keyword");
  });

  it("records a semantic request only when the flag is on", () => {
    expect(shouldRecordSemanticRequest("semantic", true)).toBe(true);
    expect(shouldRecordSemanticRequest("semantic", false)).toBe(false);
    expect(shouldRecordSemanticRequest("keyword", true)).toBe(false);
  });
});
