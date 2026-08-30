# Sprint 14 Summary — Analytics

Status: **Done**
Plan: `documents/sprint-planning/sprint-14-analytics.md`
Related: [ADR 0014](../decisions/0014-analytics-ingest-and-retention.md),
[Event taxonomy](../analytics/event-taxonomy.md),
[KPI formulas](../analytics/kpi-formulas.md),
[Funnel](../analytics/funnel.md),
[Retention and privacy](../analytics/retention-and-privacy.md),
[Data-quality review](../security/sprint-14-analytics-data-quality-review.md)

## Outcome

First-party event ingest, sequential conversion funnel, KPI/search/
product/cohort admin views, client tracker (`@ecom/analytics`), and
worker rollup/retention. Reuses Sprint 12 reports; no warehouse.

## What Was Built

### Backend

- `apps/api/src/analytics` — ingest + admin KPIs/funnels/search/
  products/cohorts. `GET /admin/reports/:type` (Sprint 12 catalog by
  slug or id).
- Shared helpers: sample, sanitize, funnel (`packages/shared`).
- Server hooks: cart `add_to_cart`, checkout `checkout_start`,
  payments `payment_attempt` / `order_placed`, orders
  `return_request`, discovery `search`, wishlist `wishlist_add`.
- Worker: hourly daily aggregate; daily 03:00 purge.

### Client / admin

- `@ecom/analytics`: `track()`, `ecom_session_id`, debug, fire-and-forget
  `POST /api/v1/analytics/events`.
- Storefront: `page_view`, PDP `product_view` / `variant_select`, PLP
  `filter`, banner/hero `campaign_click`.
- Admin `/analytics`. Storybook: FunnelChart, CohortTable,
  SearchAnalyticsCard, ReportFilter (KPI card and DashboardChart
  already existed).

### Seed / env

Permission `analytics:read` (`admin`, `marketing_manager`, `analyst`,
`finance`). Tables `analytics_events`, `analytics_daily_aggregates`.

Env: `ANALYTICS_ENABLED`, `ANALYTICS_SAMPLE_RATE` (0–1),
`ANALYTICS_RETENTION_DAYS` (90), `ANALYTICS_DEBUG`,
`NEXT_PUBLIC_ANALYTICS_DEBUG`.

### API

Prefix `api/v1`. OpenAPI tags `analytics` / `admin-analytics`.

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/analytics/events` | public; optional JWT |
| GET | `/admin/analytics/kpis` | `analytics:read` |
| GET | `/admin/analytics/funnels` | `analytics:read` |
| GET | `/admin/analytics/search` | `analytics:read` |
| GET | `/admin/analytics/products` | `analytics:read` |
| GET | `/admin/analytics/cohorts` | `analytics:read` |
| GET | `/admin/reports/:type` | `report:read` |

## Coverage

- Unit: shared funnel/sanitize/sample; API ingest + KPI empty range;
  worker rollup/purge; `@ecom/analytics` fetch; UI funnel/cohort/
  search/filter.
- Storybook: Admin/FunnelChart, CohortTable, SearchAnalyticsCard,
  ReportFilter.
- E2E: `playwright/tests/admin-analytics.spec.ts` (sidebar + axe).

## Pending / debt

- Apply Sprint 13+14 migrations when Prisma generate is not locked:
  `pnpm --filter @ecom/api prisma:generate`,
  `pnpm --filter @ecom/api exec prisma migrate deploy`,
  `pnpm --filter @ecom/api prisma:seed`.
- `review_submit` unused until a review write API exists.
- Funnel query is in-memory for the date range.
- No native partitioning or warehouse export.
- Search analytics events use session `"search"` (KPIs use SearchLog).

## Definition of Done

- [x] Documented event taxonomy for critical commerce interactions
- [x] KPI formulas aligned with Sprint 12 paid-order definition
- [x] Retention policy and property sanitization
- [x] Role-aware admin analytics (`analytics:read`)
- [x] ADR 0014, taxonomy, KPIs, funnel, privacy, data-quality review
