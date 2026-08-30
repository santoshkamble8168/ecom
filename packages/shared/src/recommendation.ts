import {
  DEFAULT_RECOMMENDATION_SLOTS,
  RECOMMENDATION_SLOTS,
  RECOMMENDATION_STRATEGIES,
  type RecommendationSlot,
  type RecommendationSlotConfig,
  type RecommendationStrategy,
} from "@ecom/types";

const SLOT_SET = new Set<string>(RECOMMENDATION_SLOTS);
const STRATEGY_SET = new Set<string>(RECOMMENDATION_STRATEGIES);

export function isRecommendationSlot(value: string): value is RecommendationSlot {
  return SLOT_SET.has(value);
}

export function isRecommendationStrategy(value: string): value is RecommendationStrategy {
  return STRATEGY_SET.has(value);
}

export function defaultSlotConfig(slot: RecommendationSlot): RecommendationSlotConfig {
  const found = DEFAULT_RECOMMENDATION_SLOTS.find((row) => row.slot === slot);
  if (!found) {
    return {
      slot,
      title: slot,
      strategy: "trending",
      isEnabled: true,
      fallbackProductSlugs: [],
      limit: 8,
    };
  }
  return { ...found, fallbackProductSlugs: [...found.fallbackProductSlugs] };
}

/** Semantic retrieval is not wired; always keyword even when the flag is on. */
export function resolveSearchMode(
  requested: string | undefined,
  _semanticEnabled: boolean,
): "keyword" {
  void requested;
  return "keyword";
}

export function shouldRecordSemanticRequest(
  requested: string | undefined,
  semanticEnabled: boolean,
): boolean {
  return requested === "semantic" && semanticEnabled;
}
