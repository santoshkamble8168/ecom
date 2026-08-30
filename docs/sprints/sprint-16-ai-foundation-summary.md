# Sprint 16 Summary — AI Foundation

Status: **Done**
Plan: `documents/sprint-planning/sprint-16-ai-foundation.md`
Related: [ADR 0016](../decisions/0016-rule-based-recommendations.md),
[recommendation rules](../ai/recommendation-rules.md),
[personalization privacy](../ai/personalization-privacy.md),
[experimentation checklist](../ai/experimentation-checklist.md),
[AI risk review](../security/sprint-16-ai-risk-review.md)

## Outcome

Storefront rails (home, PLP, PDP, cart, account) load **rule-based**
recommendations. Admins edit slot strategy and fallbacks. AI and
semantic search are feature-flagged and do not replace keyword search
or checkout. Personalization profiles are catalog affinities for
logged-in shoppers only.

## What was built

### Frontend

- `RecommendationRail` and `RecommendationSlotRow` in `@ecom/ui` (Storybook).
- Storefront rails on homepage, PLP, PDP, cart, account.
- Admin `/recommendations` slot editor (sidebar under Administration).
- `recommendation_view` / `recommendation_click` via `@ecom/analytics`.

### Backend

- `GET /api/v1/recommendations` and `GET /api/v1/recommendations/:slot`
- `POST /api/v1/recommendations/events` (analytics wrapper)
- `GET /api/v1/recommendations/profile` (logged-in affinities)
- Admin `GET/PATCH /api/v1/admin/recommendations/slots`
- Search `mode=semantic` records `semantic_search` when the flag is on;
  retrieval stays keyword.

### Database

- `recommendation_slot_configs`
- `personalization_profiles`
- Seeded slots and flags: `recommendations.ai` (off), `search.semantic`
  (off), `personalization.profiles` (on)

### Worker

- Hourly affinity aggregation; daily 04:00 purge
  (`PERSONALIZATION_RETENTION_DAYS`, default 90).

### YAGNI / documented exceptions

- No vector DB, embeddings, or model provider.
- No recommendation result table (Redis TTL cache only).
- No experiment assignment service.

## Definition of Done

- [x] Core shopping works with AI flags off
- [x] Deterministic fallbacks per slot
- [x] Admin slot control without code changes
- [x] Personalization is consent/flag gated and PII-free
- [x] ADR 0016 and sprint docs
