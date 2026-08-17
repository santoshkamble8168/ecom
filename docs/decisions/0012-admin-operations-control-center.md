# ADR 0012: Admin Operations Control Center

- Status: Accepted
- Date: 2026-08-17
- Sprint: Sprint 12 — Admin Dashboard

## Context

Sprint 12 turns the admin portal into an operations control center:
live KPIs, customer support actions, searchable audit, environment-
aware flags, allowlisted settings, and long-running report exports.
A warehouse of pre-aggregated dashboard tables, sticky per-user flag
bucketing, and impersonation would add moving parts before the
operator workflows exist. KPI cards are easy to misread without
frozen definitions.

## Decision

**1. Live aggregates + Redis TTL cache, not warehouse tables.**
`GET /admin/dashboard` runs Postgres counts/sums (paid orders,
checkouts, returns, refunds, stock, search logs) and caches the
snapshot in Redis for `DASHBOARD_CACHE_TTL_SECONDS` (default 60).
There is no `DashboardAggregate` table. KPI math is documented in
the [operations guide](../admin/operations-guide.md) (UTC windows;
paid = status not in `pending_payment` / `cancelled` / `failed`).

**2. Async `ExportJob` for reports.** `POST /admin/reports/:id/export`
inserts a `queued` row and returns. The worker’s minute cron writes
CSV under `EXPORT_STORAGE_PATH`. `GET /admin/exports/:id` is the poll
API. Audit CSV export stays synchronous (`GET /admin/audit-logs/export`)
because it is a filtered dump, not a catalog report. Format is CSV
only.

**3. `requestId` is the correlation ID.** `RequestIdMiddleware` sets
`x-request-id` (incoming or generated). `AuditLog.requestId` stores
it. Admin list/export filter `correlationId` maps to that column.

**4. Flags are environment + percent gate, not per-user sticky.**
`FeatureFlag.environment` is `all` or a `NODE_ENV` value.
`rolloutPercent` is a binary env-wide gate: `>= 100` is on, anything
lower is off (not random, not per-user sticky). Evaluation is cached
for `FEATURE_FLAG_CACHE_TTL_SECONDS` (default 30). This is enough to
hide unfinished work (`wallet.enabled`, `checkout.new_flow`); it is
not an experimentation platform.

**5. Customer writes are support notes + suspend only.**
`customer:write` allows `POST .../notes` and `PATCH .../status`
(`active` | `suspended`). No impersonation, account merge, or
helpdesk tickets. Mutations go through `AuditService` with
`before`/`after`.

**6. New RBAC keys and roles rather than overloading `admin:access`.**
`dashboard:read`, `customer:read/write`, `audit:read/export`,
`feature_flag:read/write`, `settings:read/write`, `report:read/export`.
New roles: `analyst`, `finance`. Settings PATCH is an allowlist of
seeded keys.

## Consequences

- Dashboard numbers can lag up to the Redis TTL and will miss events
  that arrived during the cached window. Operators should refresh
  after a TTL, not assume real-time finance figures.
- Redis down in development: the API still boots; dashboard/flag
  reads fall through to Postgres (or fail closed on flags if the
  cache layer errors — callers must not treat a cache miss as “on”).
- Export files are local disk, not MinIO. Retention is
  `REPORT_RETENTION_DAYS`. Audit rows older than
  `AUDIT_RETENTION_DAYS` are deleted (no archive store).
- A percent-rolled flag can flip between requests for the same user.
- Suspended customers keep valid JWTs until expiry; suspend is an
  operator signal, not a session kill.

## Revisit Triggers

- Sprint 14 analytics warehouse / event funnels (replace live
  dashboard scans if volume hurts).
- Sticky per-user flag assignment or a real experiment framework.
- Object-storage exports (MinIO) or Excel/PDF.
- Impersonation or account merge for support.
- Saved-views UI on top of the existing `SavedView` table.
- JWT/refresh checks against `User.status` on every request.
