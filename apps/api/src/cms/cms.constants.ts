/**
 * Fixed vocabularies for the CMS domain (Sprint 11). These mirror the union
 * types declared in `packages/types/src/cms.ts` — keep both in sync.
 */
export const PAGE_TYPES = ["landing", "policy", "faq", "homepage", "campaign"] as const;
export const CONTENT_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export const BANNER_PLACEMENTS = ["homepage_hero", "homepage_strip", "category_top", "cart_strip"] as const;
export const PAGE_SECTION_KINDS = [
  "hero_banner",
  "banner_strip",
  "collection_grid",
  "campaign_grid",
  "rich_text",
  "hero",
  "feature_grid",
  "fit_guide",
  "story",
  "cta_banner",
  "trust_row",
] as const;

/** Lowercase, single-hyphen-separated slug — no leading/trailing/double hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
