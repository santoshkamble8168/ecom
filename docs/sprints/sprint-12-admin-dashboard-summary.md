# Sprint 12 Summary — Admin Dashboard

Status: **Done**
Plan: `documents/sprint-planning/sprint-12-admin-dashboard.md`
Related: [ADR 0012](../decisions/0012-admin-operations-control-center.md),
[Operations guide](../admin/operations-guide.md),
[Audit dictionary](../admin/audit-log-dictionary.md),
[Feature-flag governance](../admin/feature-flag-governance.md),
[Report catalog](../admin/report-catalog.md),
[Sprint 12 security review](../security/sprint-12-admin-security-review.md)

## Outcome

Admin is an operations control center: KPI dashboard, customer
profiles with notes/suspend, searchable/exportable audit, environment
+ percent feature flags, allowlisted platform settings, and async CSV
report jobs. New roles `analyst` and `finance`. KPI math is frozen in
the operations guide so cards are not mistaken for finance close.

## What Was Built

### Backend

- `apps/api/src/dashboard` — live aggregates, Redis TTL cache.
- `apps/api/src/customers` — list/detail, notes, status.
- `apps/api/src/platform` — audit list/export, flags, settings.
- `apps/api/src/reports` — catalog + `ExportJob` queue/poll.
- `AuditLog` gained `ipAddress`, `before`, `after`; indexes on
  `action`, `createdAt`, `requestId`.
- `FeatureFlag` gained `environment`, `rolloutPercent`.
- Tables: `CustomerSupportNote`, `ReportDefinition`, `ExportJob`,
  `SavedView`, `ScheduledJobRun`.
- Worker: `processQueuedExports` every minute;
  `archiveExpiredAuditLogs` daily 03:00. Files under
  `EXPORT_STORAGE_PATH`.

### Admin

`/` dashboard, `/customers`, `/customers/[id]`, `/audit-logs`,
`/feature-flags`, `/settings`, `/reports`.

### Seed / env

`admin-dashboard.seed.ts` (settings + nine report definitions).
Permissions and roles in `prisma/seed.ts`. Env:
`EXPORT_STORAGE_PATH`, `REPORT_RETENTION_DAYS`,
`DASHBOARD_CACHE_TTL_SECONDS`, `AUDIT_RETENTION_DAYS`,
`FEATURE_FLAG_CACHE_TTL_SECONDS`.

### API

Prefix `api/v1`. JWT + `@Permissions`.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/admin/dashboard` | `dashboard:read` |
| GET | `/admin/customers`, `/admin/customers/:id` | `customer:read` |
| POST | `/admin/customers/:id/notes` | `customer:write` |
| PATCH | `/admin/customers/:id/status` | `customer:write` |
| GET | `/admin/audit-logs` | `audit:read` |
| GET | `/admin/audit-logs/export` | `audit:export` |
| GET | `/admin/feature-flags` | `feature_flag:read` |
| PATCH | `/admin/feature-flags/:key` | `feature_flag:write` |
| GET | `/admin/settings` | `settings:read` |
| PATCH | `/admin/settings` | `settings:write` |
| GET | `/admin/reports` | `report:read` |
| POST | `/admin/reports/:id/export` | `report:export` |
| GET | `/admin/exports/:id` | `report:read` |

## Coverage

- Unit: dashboard, customers, audit, feature-flag, settings, reports
  service specs.
- Storybook: `Admin/*` (KPI card, chart, alert, customer timeline,
  audit table, flag row, settings form, report card).
- E2E: `playwright/tests/admin-dashboard-ops.spec.ts`.

## Pending / debt

- Impersonation, account merge, helpdesk tickets — YAGNI.
- Excel/PDF export — CSV only.
- Sticky per-user / percentage traffic split — `rolloutPercent` is on only at 100.
- Dashboard aggregate / warehouse tables — live SQL + Redis TTL.
- Command palette — not built.
- Saved views UI — `SavedView` table only.
- Suspend does not revoke JWTs (security review finding #7).
- Export files on local disk, not MinIO.

## Definition of Done

- [x] Admin dashboard surfaces actionable operational KPIs
- [x] Customer management actions are permission-protected and audited
- [x] Audit logs are searchable and exportable
- [x] Feature flags are environment-aware and cached
- [x] Reports support long-running export jobs without blocking requests
- [x] Storybook + E2E specs
- [x] Operations guide, audit dictionary, flag governance, report
      catalog, ADR 0012, security review
