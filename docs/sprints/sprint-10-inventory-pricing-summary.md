# Sprint 10 Summary — Inventory & Pricing

Status: **Done**
Plan: `documents/sprint-planning/sprint-10-inventory-pricing.md`
Related: [ADR 0010](../decisions/0010-inventory-ledger-and-price-resolution.md),
[Stock ledger](../inventory/stock-ledger.md),
[Price & promotion rules](../pricing/price-and-promotion-rules.md),
[Stock adjustment playbook](../runbooks/stock-adjustment-playbook.md),
[Flash-sale playbook](../runbooks/flash-sale-playbook.md),
[Sprint 10/11 security review](../security/sprint-10-11-inventory-pricing-cms-security-review.md)

## Outcome

Sprint 10 makes inventory and pricing first-class domains: multi-warehouse
stock with an append-only ledger and checkout reservations; default-list
MRP/selling/sale prices with history and tax rules; coupons with
per-user limits and combinability; time-bound campaigns with a state
machine. Admin can operate stock, POs, prices, coupons, and campaigns
without a deploy. Storefront PLP/PDP/cart use the same effective price.

## What Was Built

### Backend

- `apps/api/src/inventory` — warehouses, stock list/adjust/transfer,
  movements, low-stock, suppliers, purchase orders (create, status,
  receive, `GET /admin/purchase-orders/:id`).
- `apps/api/src/pricing` — price lists, product prices, simulation,
  tax rules, `getEffectivePricesForSkus` / `getCampaignBadgesForSkus`.
- `apps/api/src/promotions` — coupons, campaigns, attachments,
  `validateCouponForUser`, `recordCouponUsage`.
- Checkout/payments: reserve on place, consume on capture; cart uses
  `PricingService.getEffectivePrice`.
- Worker crons: reservation TTL, low-stock scan, sale expiry, campaign
  activate/end.

### Admin

Inventory (stock, movements, warehouses, suppliers, POs), Pricing
(prices, lists, tax rules, simulation), Coupons, Campaigns.

### Storefront

`PriceDisplay` / `ProductCard` sale strikethrough + campaign badge;
PDP savings math uses effective price.

### Database

Migration `20260817160751_sprint10_11_inventory_pricing_promotions_cms_marketing`
(shared with Sprint 11). Seeds: `inventory.seed.ts`, `pricing.seed.ts`,
`promotions.seed.ts`.

### API (admin unless noted)

| Method | Path | Permission |
| --- | --- | --- |
| GET/POST | `/admin/warehouses` | inventory:read/write |
| PATCH | `/admin/warehouses/:id` | inventory:write |
| GET | `/admin/stock`, `/admin/stock/low-stock`, `/admin/stock/movements` | inventory:read |
| POST | `/admin/stock/adjust`, `/admin/stock/transfer` | inventory:write |
| GET/POST | `/admin/suppliers` | inventory:read/write |
| GET/POST | `/admin/purchase-orders` | inventory:read/write |
| GET | `/admin/purchase-orders/:id` | inventory:read |
| PATCH/POST | `/admin/purchase-orders/:id/status`, `.../receive` | inventory:write |
| GET/POST | `/admin/price-lists`, `/admin/prices`, `/admin/tax-rules` | pricing:* |
| POST | `/admin/prices/simulate` | pricing:read |
| GET/POST/PATCH | `/admin/coupons`, `/admin/campaigns` (+ attachments) | promotion:* |
| GET | `/campaigns/:slug/products` | public |

## Coverage

- Unit: inventory service/PO policy, price-resolution policy, campaign
  policy, promotions/pricing/inventory specs.
- Storybook: `PriceDisplay`, `ProductCard` sale/badge, `StatusPill`
  (PO/campaign/low-stock), `PriceBreakdown`.
- E2E: `playwright/tests/admin-inventory-pricing.spec.ts`,
  `storefront-pricing.spec.ts` (need local API + apps running).

## Pending / debt

- Storefront always uses the **default** price list (no geo/B2B lists).
- Campaign badge is merchandising; payable amount still comes from
  `ProductPrice` / coupons (documented in the flash-sale playbook).
- PO/supplier have no PATCH-for-header on suppliers/price lists.
- Tax `categoryId` is a free-text id in admin (no category picker).
- Low-stock alerts are admin banner + worker log, not email/SMS
  (Sprint 13).
- Performance of price resolution under large catalogs not load-tested.

## Definition of Done

- [x] Feature across API, DB, admin, storefront, worker, validation, audit
- [x] Inventory cannot go below zero on adjustment
- [x] Prices/promotions server-owned and permissioned
- [x] Scheduled prices/campaigns via worker
- [x] Storefront/cart/checkout share pricing source
- [x] Storybook + E2E specs
- [x] Docs + security review
