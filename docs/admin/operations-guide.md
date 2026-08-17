# Admin Operations Guide

Audience: ops, support, finance, and analysts with `admin:access`.
See [ADR 0012](../decisions/0012-admin-operations-control-center.md),
[KPI definitions](#kpi-definitions) below, the
[audit dictionary](./audit-log-dictionary.md),
[feature-flag governance](./feature-flag-governance.md), and the
[report catalog](./report-catalog.md).

Admin UI: `/` (dashboard), `/customers`, `/customers/[id]`,
`/audit-logs`, `/feature-flags`, `/settings`, `/reports`.
API prefix `api/v1`. All routes require JWT + a `@Permissions` key.

## Roles

| Role | Typical use | Extra vs `admin:access` |
| --- | --- | --- |
| `admin` | Full control | every permission |
| `analyst` | Read KPIs, customers, audit; export reports | `dashboard:read`, `customer:read`, `audit:read`, `report:read`, `report:export` |
| `finance` | Sales/tax/refund reports | `dashboard:read`, `order:read`, `report:read`, `report:export` |
| `customer_support` | Customer profile + notes/suspend | `dashboard:read`, `customer:read`, `customer:write`, `order:*` |
| `catalog_manager` / `inventory_manager` / `marketing_manager` | Domain work + dashboard | `dashboard:read` (inventory/marketing also `report:read`) |

`analyst` cannot export audit CSV (`audit:export`). `finance` cannot
read customer PII. There is **no impersonation** — support cannot act
as a shopper.

## Dashboard

`GET /admin/dashboard?from=&to=` (`dashboard:read`). Numbers are live
Postgres aggregates cached in Redis for
`DASHBOARD_CACHE_TTL_SECONDS` (default 60). There is no warehouse /
rollup table. Treat cards as operational, not finance close.

### KPI definitions

Paid orders = `Order.status` **not in** `pending_payment`,
`cancelled`, `failed`. Confirmed through delivered, plus return/
exchange statuses, all count as paid.

All “today” / “this month” windows are **UTC**.

| KPI | Definition |
| --- | --- |
| Revenue today / month | Sum of paid order `total` in the UTC day / month |
| AOV | Month revenue / month paid-order count (0 if no paid orders) |
| Conversion | Paid orders / checkout sessions **created** in the range |
| Cart abandonment | 1 − (checkouts in status `order_prepared` / checkouts created) |
| Return rate | Return requests / paid orders |
| Refund rate | Refunds with status `completed` / payments with status `captured` |
| Active users | Distinct `Order.userId` on paid orders in the last 30 days |
| Inventory alerts | Stock rows where `onHand − reserved ≤ lowStockThreshold` |
| Failed payments | Count of `Payment.status = failed` created today (UTC) |
| Search no-results | Count of `SearchLog` rows with `resultCount = 0` created today (UTC) |

Do not compare these to accounting revenue, unique visitors, or
login-based “active users”.

## Customers

`GET /admin/customers` (`q`, `status`, `page`, `pageSize`) and
`GET /admin/customers/:id` (`customer:read`). Detail includes profile
preferences, addresses, orders, returns, reviews, loyalty points,
support notes, and a timeline.

Write actions (`customer:write`) — these are the **only** customer
mutations this sprint:

1. **Add note** — `POST /admin/customers/:id/notes` (`body` 1–2000
   chars). Append-only `CustomerSupportNote`.
2. **Suspend / unsuspend** — `PATCH /admin/customers/:id/status`
   with `active` or `suspended`.

Both writes emit `AuditLog` with `before` / `after`. Suspend sets
`User.status`; it does **not** revoke existing JWTs (access TTL 15m,
refresh 30d). Not built: impersonation, account merge, helpdesk
tickets.

## Audit logs

`GET /admin/audit-logs` (`audit:read`) filters: `actorId`, `action`,
`entityType`, `entityId`, `correlationId` (maps to `requestId`),
`from`, `to`, `page`, `pageSize` (max 100).
`GET /admin/audit-logs/export` (`audit:export`) returns CSV of the
same filter. Correlation ID is the request `x-request-id`.
See the [dictionary](./audit-log-dictionary.md).

Worker `archiveExpiredAuditLogs` runs daily at 03:00 and deletes rows
older than `AUDIT_RETENTION_DAYS` (default 365). There is no cold
archive table.

## Feature flags and settings

Flags: [governance](./feature-flag-governance.md). Settings:
`GET`/`PATCH /admin/settings` (`settings:read`/`write`). PATCH is an
**allowlist** of seeded keys only:

| Key | Seeded value |
| --- | --- |
| `store.name` | `"ECOM"` |
| `store.currency` | `"INR"` |
| `store.timezone` | `"Asia/Kolkata"` |
| `store.maintenanceMode` | `false` |
| `seo.defaultTitle` | `"ECOM — Shop apparel"` |
| `notifications.emailEnabled` | `true` |

Unknown keys are rejected. Display timezone does **not** change KPI
UTC windows.

## Reports

Catalog and export flow: [report catalog](./report-catalog.md).
`POST /admin/reports/:id/export` queues an `ExportJob` (CSV only);
the worker writes files under `EXPORT_STORAGE_PATH` (default
`./tmp/exports`). Poll `GET /admin/exports/:id`. Retention
`REPORT_RETENTION_DAYS` (default 14).

`SavedView` exists in the database; there is no saved-views UI.

## Worker and env

| Job | Schedule | Purpose |
| --- | --- | --- |
| `processQueuedExports` | every minute | Drain `ExportJob` status `queued` → CSV on disk |
| `archiveExpiredAuditLogs` | daily 03:00 | Drop audit rows past retention |

| Variable | Default |
| --- | --- |
| `EXPORT_STORAGE_PATH` | `./tmp/exports` |
| `REPORT_RETENTION_DAYS` | `14` |
| `DASHBOARD_CACHE_TTL_SECONDS` | `60` |
| `AUDIT_RETENTION_DAYS` | `365` |
| `FEATURE_FLAG_CACHE_TTL_SECONDS` | `30` |

Keep `EXPORT_STORAGE_PATH` off the public web root. Files can contain
order and customer fields.
