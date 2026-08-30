# Sprint 14 Data-Quality Review — Analytics

Status: Complete
Reviewed: Sprint 14 (ingest, hooks, KPIs, funnel, retention)
Scope: `apps/api/src/analytics`, worker `analytics-jobs`,
`packages/shared/src/analytics.ts`, `packages/analytics`,
storefront trackers, admin `/analytics`

## Summary

Events are allowlisted, properties are stripped of secret-shaped keys,
and commerce writes never wait on ingest. Findings below are accepted
risks.

## Findings Logged As Accepted Risk

| # | Finding | Severity | Rationale / Plan |
| --- | --- | --- | --- |
| 1 | Public `POST /analytics/events` can be stuffed with junk names (rejected) or valid names (sampled). No auth required. | Medium (noise / cost) | `@SkipThrottle()` by design so page_view is not 429'd. Unique `clientEventId` + sampling. Revisit rate limits if abused. |
| 2 | Funnel query loads all matching in-range events into API memory. | Medium at volume | Documented MVP debt. Switch to aggregates when dashboards slow. |
| 3 | Server search events use sessionId `"search"`, so they do not join the conversion funnel. | Low | Search KPIs use `SearchLog`. Dual-write is for taxonomy completeness. |
| 4 | `review_submit` is unused (no review create API). | Low | Taxonomy reserved; do not invent a client-only review event. |
| 5 | Cohorts are first-order-month **within the selected range**, not lifetime first order. | Low | Documented in KPI formulas. A true cohort matrix is a later job. |
| 6 | JWT on ingest is optional; anonymous sessions cannot be stitched to users until login on a later request. | n/a (product) | Session id is the join key for funnel. |
| 7 | `ANALYTICS_DEBUG` / console.debug can log paths and properties in the browser. | Low | Off by default. Do not enable in production. |
| 8 | Prisma generate/migrate must run for `AnalyticsEvent` types. DLL lock on Windows can block generate. | Ops | Stop API/worker, then `prisma:generate` + `migrate deploy`. |

## Strengths Confirmed

- Secret keys stripped from properties.
- Fire-and-forget hooks on cart/checkout/payment/order/wishlist/search.
- Dedupe via unique `clientEventId`.
- Admin gated by `analytics:read`.
- Retention delete job exists.
- Paid-order definition matches Sprint 12 dashboard.
