# ADR 0016: Rule-based recommendations with AI-ready flags

- Status: Accepted
- Date: 2026-08-30
- Sprint: Sprint 16 — AI Foundation

## Context

Sprint 16 needs recommendation slots, personalization hooks, and semantic
search readiness. A vector database, embedding pipeline, and live model
provider would make AI a dependency of discovery and checkout. Core
shopping must keep working when AI is off.

## Decision

**1. Rule-based MVP; no vector store.**
Slots resolve through deterministic strategies: trending (newest
published), similar (same category), complete the look (same
collection), frequently bought (SKU co-occurrence on paid orders),
and recently viewed. Results cache in Redis for
`RECOMMENDATION_CACHE_TTL_SECONDS` (default 60). There is no
`recommendation_results` table and no embedding index.

**2. Feature flags gate future AI, not shopping.**
`recommendations.ai` and `search.semantic` default **off**. When
`recommendations.ai` is on, the API still returns `provider: "rules"`
and a reason that no model is wired. Semantic `mode=semantic` is
recorded as `semantic_search` only when the flag is on; retrieval
stays keyword (Meilisearch or Postgres). `SEMANTIC_SEARCH_PROVIDER`
is `none`.

**3. Admins own slots without deploys.**
`RecommendationSlotConfig` stores title, strategy, enabled flag,
fallback product slugs, and limit. Seeded defaults match
`DEFAULT_RECOMMENDATION_SLOTS`. Permissions:
`recommendation:read` / `recommendation:write`.

**4. Personalization is logged-in, catalog-only.**
`PersonalizationProfile` stores category and product slug affinities
derived from `RecentlyViewed`. No email, phone, or payment data.
The worker job no-ops when `personalization.profiles` is off.
Retention: `PERSONALIZATION_RETENTION_DAYS` (default 90).

**5. Recommendation events reuse analytics ingest.**
`recommendation_view` and `recommendation_click` are taxonomy names.
`POST /api/v1/recommendations/events` is a thin wrapper around
analytics ingest so rails do not need a second pipeline.

## Consequences

- Homepage, PDP, PLP, cart, and account rails degrade to empty (hidden)
  if the API is down; checkout is unaffected.
- Frequently-bought is a 200-order heuristic, not a warehouse basket
  model.
- Enabling `recommendations.ai` does not change product ranking until
  a provider adapter is added.

## Revisit Triggers

- A contracted recommendation or embedding vendor.
- Vector search that beats keyword on an offline eval set.
- Recommendation latency above the performance budget after cache miss.
