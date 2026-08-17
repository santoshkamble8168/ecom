# ADR 0010: Inventory Ledger and Server-Owned Price Resolution

- Status: Accepted
- Date: 2026-08-17
- Sprint: Sprint 10 — Inventory & Pricing

## Context

Sprint 10 needs stock that cannot silently go negative, an auditable
movement history, multi-warehouse operations, and a single source of
truth for selling price (MRP / selling / scheduled sale) that PLP, PDP,
cart, and checkout all share. Promotions (coupons + time-bound
campaigns) must be configurable in admin without a deploy, and
scheduled prices/campaigns must activate without an operator sitting
on a clock.

## Decision

**1. Treat `StockItem` as a current-balance cache and `StockMovement`
as the append-only ledger.** `onHand` / `reserved` on `StockItem` are
updated inside the same Prisma transaction as the matching
`StockMovement` row. Movements are never updated or deleted. Available
sellable quantity is always `onHand - reserved`. Adjustments that would
drive `onHand` below zero are rejected (`ValidationError`) — there is
no "approved negative correction" path in this sprint.

**2. Reservations are checkout-scoped with a TTL.** Placing an order
creates `StockReservation` rows (`status: active`). Successful payment
consumes them (`onHand` and `reserved` both decrement). Failed payments
do **not** immediately release — the worker's minute cron expires
`expiresAt < now` rows so a retry in the same checkout window can still
consume the reservation. Partial reserve failure rolls back the
reservations created in that attempt.

**3. Price resolution is a pure policy**
(`resolveEffectivePrice` in `apps/api/src/pricing/policies/price-resolution.policy.ts`).
A sale is active only while `now` is inside `[saleStartsAt, saleEndsAt]`
(open bounds allowed). `PricingService.getEffectivePricesForSkus` batches
lookups against the default `PriceList` so PLP/search/homepage rails do
not N+1. Catalog `basePrice` remains the fallback when no
`ProductPrice` row exists. Optional `effectivePrice` / `saleActive` /
`campaignBadge` on `ProductSummary` are additive and non-breaking.

**4. Coupons and campaigns are separate models.** Coupons are
code-driven cart discounts (per-user limits, combinability,
category/collection eligibility, `CouponUsage` ledger). Campaigns are
time-window merchandising discounts attached to SKUs and/or
collections, with an explicit state machine
(`scheduled → active → ended`, plus `cancelled` from non-terminal
states). The worker flips campaign status from `startsAt`/`endsAt`.

**5. New RBAC permissions rather than reusing catalog write.**
`inventory:read/write`, `pricing:read/write`, `promotion:read/write`.
Every mutation also writes `AuditLog`.

**6. Background work lives in `apps/worker` as `@nestjs/schedule`
crons**, not BullMQ (no queue infrastructure was required for these
sweeps): expired reservation release (1 min), low-stock scan (hourly),
expired sale window clear (5 min), campaign activate/end (5 min).

## Consequences

- Cart, checkout, and storefront cards all call the same pricing
  service, so a scheduled sale cannot show one price on PLP and another
  at pay.
- Oversell protection depends on reservation TTL being longer than a
  typical checkout and on the worker running. If the worker is down,
  expired reservations stay reserved until it catches up.
- Regional / B2B price lists are modeled (`PriceList.currency`) but
  storefront resolution always uses the default list this sprint.

## Revisit Triggers

- Need for approved negative stock corrections (cycle-count write-off).
- Customer-specific or geo price lists on the storefront.
- Moving cron sweeps onto BullMQ once notification/analytics workers
  already require a Redis queue consumer.
