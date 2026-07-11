# Sprint 10 - Inventory & Pricing

Theme: Stock, warehouses, promotions, scheduled pricing  
Primary source volumes: Volume 1, Volume 5, Volume 6, Volume 8, Volume 9, Volume 10  
Status: Not Started

## Sprint Goal

Implement inventory and pricing as first-class business domains, including warehouses, stock ledger, reservations, adjustments, purchase records, low-stock alerts, price lists, scheduled pricing, tax rules, coupons, promotions, and price simulation.

## Business Outcome

The business can avoid overselling, track stock accurately, manage campaigns without code changes, and protect margins through auditable pricing and promotion rules.

## Scope

- Multi-warehouse inventory, stock items, reserved stock, stock movements, adjustments, transfers, purchase orders, suppliers, and alerts.
- Pricing with MRP, selling price, sale price, scheduled pricing, regional pricing readiness, taxes, and price history.
- Promotion engine with coupons, rules, usage limits, eligibility, combinability, cart discounts, free shipping, and campaign hooks.
- Admin workflows for stock update, price update, coupon creation, promotion scheduling, and price simulation.

## Deliverables

### Frontend

- Admin inventory dashboard, stock table, warehouse manager, adjustment form, transfer form, low-stock alerts, and purchase-order shell.
- Admin pricing screens for product prices, scheduled prices, tax rules, coupon rules, promotion rules, and price simulation.
- Storefront price and offer display updates across Product Card, PLP, PDP, cart, and checkout.
- Storybook stories for stock badge, inventory table, adjustment form, price editor, coupon rule form, promotion badge, and price breakdown.

### Backend

- Inventory domain with warehouse, stock item, reserved stock, stock movement, supplier, and purchase order.
- Pricing domain with price list, product price, regional price, tax rule, and price history.
- Promotion domain with coupon, coupon rules, coupon usage, campaigns, campaign products, and campaign collections.
- Events: `InventoryReserved`, `InventoryReleased`, `StockAdjusted`, `ProductPriceChanged`, `CouponApplied`, `CampaignStarted`.

### Database

- Inventory, pricing, and promotion schema migrations.
- Ledger-style stock movement records with no destructive history updates.
- Indexes for SKU/variant, warehouse, available stock, stock status, active price, scheduled price dates, coupon code, campaign status, and usage lookup.
- Seed warehouses, stock, prices, tax rules, coupons, and campaigns.

### API

- Admin inventory endpoints for warehouses, stock, adjustments, transfers, suppliers, and purchase orders.
- Admin pricing endpoints for prices, tax rules, scheduled prices, and simulation.
- Admin promotion endpoints for coupons, campaigns, rules, usage, and activation.
- Storefront price/offer read endpoints integrated into catalog, PLP, PDP, cart, and checkout responses.

### DevOps

- Environment variables for reservation TTL, low-stock threshold defaults, promotion cache TTL, price cache TTL, and tax defaults.
- Worker jobs for scheduled price activation, campaign activation, low-stock alerts, and expired reservation release.
- Monitoring for stock reservation failures and campaign rule errors.

### QA

- Unit tests for stock ledger rules, reservation policy, price selection, scheduled pricing, coupon eligibility, promotion combinability, and tax calculation.
- Integration tests for inventory adjustment, reservation/release, price update, scheduled price activation, coupon usage, and cart/checkout totals.
- E2E tests for admin stock update, admin price update, coupon campaign, and storefront price display.
- Accessibility checks for admin grids, bulk actions, alerts, and price forms.
- Performance review for price resolution, stock checks, and promotion evaluation.

### Documentation

- Inventory ledger documentation.
- Pricing and promotion rule documentation.
- Admin operations playbooks for stock adjustment and flash sale launch.
- OpenAPI inventory/pricing docs.
- Sprint summary and financial-control review.

## Acceptance Criteria

- Inventory cannot go below zero unless an explicit approved adjustment policy allows correction entries.
- Price and promotion rules are server-owned, auditable, and configurable.
- Scheduled prices and campaigns activate through background jobs.
- Storefront, cart, and checkout use the same pricing source.
- Admin changes are permission-protected and logged.

## Dependencies

- Sprint 2 catalog, Sprint 6 cart, Sprint 7 checkout, Sprint 9 orders.

## Risks

- Inventory ledger mistakes can create stock and accounting issues.
- Promotion complexity can grow quickly if rules are not modeled cleanly.
- Scheduled pricing must avoid race conditions during campaign launches.
