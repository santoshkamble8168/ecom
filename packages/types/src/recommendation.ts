import type { ProductSummary } from "./catalog";

export const RECOMMENDATION_SLOTS = [
  "homepage_trending",
  "plp_trending",
  "pdp_similar",
  "pdp_complete_the_look",
  "cart_trending",
  "cart_frequently_bought",
  "recently_viewed",
] as const;

export type RecommendationSlot = (typeof RECOMMENDATION_SLOTS)[number];

export const RECOMMENDATION_STRATEGIES = [
  "trending",
  "similar",
  "recently_viewed",
  "frequently_bought",
  "complete_the_look",
] as const;

export type RecommendationStrategy = (typeof RECOMMENDATION_STRATEGIES)[number];

export const DEFAULT_RECOMMENDATION_SLOTS: RecommendationSlotConfig[] = [
  {
    slot: "homepage_trending",
    title: "Trending now",
    strategy: "trending",
    isEnabled: true,
    fallbackProductSlugs: ["classic-crew-neck-tee", "oversized-graphic-tee"],
    limit: 8,
  },
  {
    slot: "plp_trending",
    title: "Popular picks",
    strategy: "trending",
    isEnabled: true,
    fallbackProductSlugs: ["classic-crew-neck-tee"],
    limit: 8,
  },
  {
    slot: "pdp_similar",
    title: "Similar styles",
    strategy: "similar",
    isEnabled: true,
    fallbackProductSlugs: ["classic-crew-neck-tee"],
    limit: 8,
  },
  {
    slot: "pdp_complete_the_look",
    title: "Complete the look",
    strategy: "complete_the_look",
    isEnabled: true,
    fallbackProductSlugs: ["oversized-graphic-tee"],
    limit: 8,
  },
  {
    slot: "cart_trending",
    title: "You may also like",
    strategy: "trending",
    isEnabled: true,
    fallbackProductSlugs: ["classic-crew-neck-tee"],
    limit: 8,
  },
  {
    slot: "cart_frequently_bought",
    title: "Frequently bought together",
    strategy: "frequently_bought",
    isEnabled: true,
    fallbackProductSlugs: ["womens-basic-vneck-tee"],
    limit: 8,
  },
  {
    slot: "recently_viewed",
    title: "Recently viewed",
    strategy: "recently_viewed",
    isEnabled: true,
    fallbackProductSlugs: [],
    limit: 8,
  },
];

export interface RecommendationSlotConfig {
  slot: RecommendationSlot;
  title: string;
  strategy: RecommendationStrategy;
  isEnabled: boolean;
  fallbackProductSlugs: string[];
  limit: number;
}

export interface RecommendationResult {
  slot: RecommendationSlot;
  title: string;
  strategy: RecommendationStrategy;
  provider: "rules";
  reason: string;
  fallbackUsed: boolean;
  aiEnabled: boolean;
  products: ProductSummary[];
}

export interface RecommendationEventInput {
  name: "recommendation_view" | "recommendation_click";
  slot: RecommendationSlot;
  productSlug?: string;
  sessionId: string;
}

export interface PersonalizationAffinity {
  slug: string;
  score: number;
}

export interface PersonalizationProfileSummary {
  subjectType: "user";
  categoryAffinities: PersonalizationAffinity[];
  productAffinities: PersonalizationAffinity[];
  updatedAt: string;
}

export type SearchRetrievalMode = "keyword" | "semantic";
