# ADR 0014: Analytics Ingest, Funnel, and Retention

- Status: Accepted
- Date: 2026-08-30
- Sprint: Sprint 14 — Analytics

## Context

Sprint 14 needs storefront + server events, KPI/funnel dashboards,
and search/product/cohort views. A warehouse, native Postgres
partitioning, and a `dashboard_configs` table would duplicate Sprint 12
reports/dashboard. Client ingest must not block checkout. PII in event
properties would leak through admin analytics.

## Decision

**1. Postgres events + daily aggregates; no warehouse.**
`AnalyticsEvent` is the source of truth. `AnalyticsDailyAggregate`
is a worker rollup for cheaper historical counts. CSV reports stay
on Sprint 12 `ReportDefinition` / `ExportJob`. There is no
`dashboard_configs` table.

**2. Indexes and delete-based retention, not partitions.**
Indexes on `(name, occurred_at)`, `(session_id, occurred_at)`,
`(user_id, occurred_at)`, and `occurred_at`. The worker deletes
rows older than `ANALYTICS_RETENTION_DAYS` (default 90). Native
partitioning is deferred until volume justifies it.

**3. Public ingest, 202 Accepted, optional JWT.**
`POST /api/v1/analytics/events` is `@Public()`, `@SkipThrottle()`,
max 25 events. A valid JWT attaches `userId`; missing auth still
accepts the batch. Duplicates use unique `clientEventId` (Prisma
`P2002` counted as duplicate). Client traffic is sampled with a
deterministic hash of `sessionId` (`shouldSample`). Server
`trackServer` is never sampled.

**4. Fire-and-forget on commerce writes.**
Cart, checkout, payment, order return, search log, and wishlist
call `void analytics.trackServer(...)`. Ingest failures are logged
and never fail the commerce transaction.

**5. Sequential session funnel.**
Funnel steps: homepage → PLP → PDP → cart → checkout → payment →
order. A session counts at step N only if it reached N−1 at an
earlier or equal timestamp (`computeFunnel`). `page_view` `/` is
homepage; `/men|/women|/search|/categories|/collections` is PLP.

**6. Privacy: strip secrets from properties.**
`sanitizeAnalyticsProperties` drops email/phone/password/token/otp/
card-shaped keys and non-scalars. Admin analytics is
`analytics:read` (`admin`, `marketing_manager`, `analyst`,
`finance`).

**7. Dual-write search.**
Existing `SearchLog` remains the search KPI source. Each logged
search also writes a `search` analytics event.

## Consequences

- Checkout latency does not depend on analytics ingest.
- Funnel queries load matching events in-range into memory (MVP
  debt; switch to aggregates when volume grows).
- `review_submit` is in the taxonomy but has no write API yet.
- Warehouse export is a revisit trigger, not this sprint.

## Revisit Triggers

- Postgres partitioning or object-store archive when delete-based
  retention is too expensive.
- Warehouse / BI export.
- Review-submit write path.
- Sampling default below 1.0 in production.
