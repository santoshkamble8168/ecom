# Report Catalog

See [ADR 0012](../decisions/0012-admin-operations-control-center.md)
and the [operations guide](./operations-guide.md). Admin: `/reports`.

Reports are **definitions + async CSV export**, not interactive BI.
Sprint 14 owns deeper analytics. Format is CSV only — no Excel/PDF.

## API

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/admin/reports` | `report:read` |
| POST | `/admin/reports/:id/export` | `report:export` |
| GET | `/admin/exports/:id` | `report:read` |

`POST` body: `{ "format": "csv", "params": {} }`. `format` other than
`csv` is rejected. The handler inserts `ExportJob` (`queued`) and
returns immediately. Worker `processQueuedExports` (every minute)
writes a file under `EXPORT_STORAGE_PATH` and sets `completed` or
`failed`. Poll `GET /admin/exports/:id` for `status`, `rowCount`,
`errorMessage`, `expiresAt`.

Jobs expire after `REPORT_RETENTION_DAYS` (default 14). Queueing is
audited (`ReportExportQueued`).

## Seeded definitions

| Slug | Kind | What the CSV contains |
| --- | --- | --- |
| `sales` | `sales` | Confirmed/paid order revenue, AOV, order counts by day (UTC). Uses the same paid-order rule as the dashboard. |
| `inventory` | `inventory` | On-hand, reserved, available (`onHand − reserved`), low-stock flag by warehouse + SKU. |
| `taxes` | `taxes` | Tax collected on paid orders. |
| `customer-retention` | `customer_retention` | Repeat vs first-time buyers in the window (from paid orders). |
| `product-performance` | `product_performance` | Units and revenue by product from order line items. |
| `category-performance` | `category_performance` | Revenue grouped by product category. |
| `search` | `search` | Queries, result counts, zero-result terms (`SearchLog`). |
| `coupons` | `coupons` | Redemptions and discount amounts (`CouponUsage`). |
| `campaigns` | `campaigns` | Campaign status and attached product/collection counts. |

IDs are stable seed UUIDs (`report-sales`, `report-inventory`, …).
Prefer `slug` in conversation; the export path uses `id`.

## Permissions

`analyst` and `finance` can read the catalog and queue exports.
`finance` also has `order:read` but not `customer:read` — sales/tax
CSVs should not be used as a customer PII dump. `marketing_manager`
and `inventory_manager` have `report:read` only (no export).

## Operational notes

- Files live on the API/worker disk, not MinIO. Do not serve
  `EXPORT_STORAGE_PATH` as static assets.
- `GET /admin/exports/:id` may include `filePath` (server path) —
  treat as internal.
- Long-running means “queued + worker”, not a streaming HTTP
  download of the CSV from `POST`.
- `SavedView` is schema-only; reports UI has no saved-filter picker.
