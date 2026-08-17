# ADR 0009: Orders Domain, Fulfillment Model, and Order State Machine

- Status: Accepted
- Date: 2026-08-17
- Sprint: Sprint 9 — Orders

## Context

Sprint 8 shipped a minimal `Order` model (`pending_payment`/`confirmed`/
`cancelled`/`failed`) purely to anchor payments — see the schema comment
"Payments + minimal Order (Sprint 8; Orders expanded in Sprint 9)" in
`apps/api/prisma/schema.prisma`. Sprint 9 needs the real post-purchase
lifecycle: fulfillment (shipments, couriers, tracking), customer
self-service (cancellation, returns, exchanges, invoices), and admin
operations (status updates, shipment creation, return/exchange
approval) — all of which must be auditable and safe against invalid
state jumps (e.g. an order can't go from "confirmed" straight to
"delivered", and a return can't be refunded before the item is
received back).

## Decision

**1. Extend `OrderStatus` in place rather than introducing a parallel
"fulfillment status" enum.** Added `processing`, `shipped`, `delivered`,
`return_requested`, `returned`, `exchange_requested`, `exchanged` to the
existing enum (`apps/api/prisma/schema.prisma`). A single source of
truth for "what state is this order in" is simpler for every consumer
(storefront order list, admin dashboard, analytics later) than
reconciling two enums. `CustomerOrderSummary`/`OrderStatus` in
`packages/types/src/customer.ts` and `packages/types/src/order.ts` are
additive, non-breaking supersets of the Sprint 8 union.

**2. Model status transitions as an explicit, testable state machine**
(`apps/api/src/orders/policies/order-state-machine.ts`), not ad hoc
`if` statements scattered across the service. `ALLOWED_TRANSITIONS` is a
lookup table; `assertTransition`/`canTransition` are pure functions unit
tested in isolation (`order-state-machine.spec.ts`, 8 cases). Every
mutation in `OrdersService` funnels through `transition()`, which
writes the new status **and** an `OrderStatusHistory` row atomically.

**3. `OrderStatusHistory` is append-only and immutable** — rows are
only ever `create`d, never updated/deleted, satisfying the Sprint 9
acceptance criterion "order history is immutable and never
destructively updated." This is the audit trail for support/finance
(who/what changed status, when, why) independent of `AuditLog` (which
covers admin-actor auditing repo-wide) — `OrderStatusHistory` is
domain-specific and directly renders as the customer-facing order
timeline.

**4. Fulfillment (`Shipment`/`ShipmentItem`/`TrackingEvent`/`Courier`)
is a separate model family from checkout's `ShippingMethod`/
`ShippingZone`.** The checkout models answer "which shipping rate did
the customer pick and pay for" (Sprint 7); `Shipment` answers "how did
the warehouse actually fulfill it" (Sprint 9) — a single order can
_conceptually_ need multiple shipments (split fulfillment) even though
the MVP only creates one per order today. Keeping them separate avoids
overloading one model with both pre-purchase rate-shopping fields and
post-purchase logistics fields.

**5. Returns and exchanges are separate models with their own state
machines**, not a single "post-purchase request" model with a `type`
discriminator. Their fields diverge enough (returns need
`refundAmount`/`evidenceUrls`; exchanges need `desiredItems`) that a
shared table would need many nullable columns. Both flow through the
same `requested → approved/rejected → item_received → refunded|
exchanged` shape, enforced in `OrdersService.adminResolveReturn` /
`adminResolveExchange` via an `action` enum per call rather than
exposing raw status transitions to the API — this keeps the admin API
intention-revealing (`action: "approve"`) instead of asking admins to
know the underlying status enum.

**6. Refunds are a first-class `RefundRequest` model**, not just a
`Payment.status = "refunded"` flip, closing the Sprint 8 "refund-ready
workflow" gap. A refund can be created from two paths: (a)
`OrdersService.adminResolveReturn(..., action: "refund")` after an
approved-and-received return, or (b) a standalone admin action
`POST /admin/payments/:id/refunds` (`PaymentsService.adminCreateRefund`)
for goodwill/out-of-band refunds not tied to a formal return (e.g. a
delayed-shipment goodwill credit, or completing the "pending" refund
hook auto-created when a customer cancels an order whose payment was
already captured). Both paths write to the same `RefundRequest` table
so finance has one place to reconcile refunds regardless of origin.

**7. Settlement ledger (`Settlement`) is recorded automatically at
capture time**, not as a manual admin action, mirroring how a real
payment gateway pushes settlement reports — see `PaymentsService.
recordSettlement()`, called from all three capture paths (mock capture,
client-confirmed Razorpay, webhook-confirmed Razorpay). This closes the
Sprint 8 "settlement ledger model" gap with a functioning (if mocked)
reconciliation trail: gross amount, gateway fee (2%), GST on fee (18%),
net payout, and a mock UTR.

**8. Invoices are generated lazily and idempotently**, not eagerly at
order-confirmation time. `OrdersService.ensureInvoice()` creates the
`Invoice` row (and its sequential-looking number, see invoice numbering
doc) on first request and returns the existing row on every subsequent
request — avoiding unnecessary writes for orders nobody ever asks an
invoice for, while still guaranteeing exactly one invoice per order
(`Invoice.orderId` is `@unique`).

**9. Tracking is public and courier-agnostic.** `GET /tracking/:shipmentNumber`
requires no authentication (mirrors real carrier tracking pages) and
returns a courier-branded `trackingUrl` built from a `{trackingNumber}`
template stored per `Courier` row, so adding a new courier is a data
change, not a code change.

## Alternatives Considered

- **A single generic "PostPurchaseRequest" table for cancel/return/exchange** —
  rejected; the divergent field shapes and the need for genuinely
  different state machines (cancellation is a single-step order
  transition, returns/exchanges are multi-step sub-workflows with their
  own approval gates) made a shared table more confusing than three
  focused models.
- **Driving all status transitions through a generic workflow engine
  (e.g. XState, a BPMN library)** — rejected as over-engineering for a
  linear, well-understood e-commerce lifecycle; a lookup-table state
  machine is easier to read, test, and reason about for this team's
  current scale, and can be swapped later if the graph grows
  materially more complex (e.g. multi-shipment split fulfillment with
  per-item state).
- **Storing shipment line items as a denormalized JSON blob (like
  `Order.lineItems`)** — rejected for `ShipmentItem`; unlike the order
  snapshot (which must stay frozen at purchase-time pricing),
  shipment items benefit from being queryable rows (e.g. "which
  shipments contain SKU X" for a recall) at a low relational cost.
- **Real PDF invoice generation (e.g. `pdfkit`/`puppeteer`)** —
  deferred; `getInvoiceHtml()` renders a clean, printable HTML document
  today (browser "Print to PDF" covers the customer need). Adding a
  server-side PDF renderer is tracked as a Sprint 17 (production
  readiness) follow-up once invoice storage/CDN requirements are
  finalized (see also ADR 0007, MinIO for object storage).

## Consequences

- Positive: every order-state change is explainable from
  `OrderStatusHistory` alone — no need to cross-reference `AuditLog` to
  answer "why is this order cancelled."
- Positive: the state machine's pure functions are trivially unit
  tested without a database (`order-state-machine.spec.ts`), and
  `OrdersService` itself is tested with a mocked Prisma client
  (`orders.service.spec.ts`) covering ownership checks, eligibility
  windows, and the return/refund action sequence.
- Positive: refunds and settlements are reconcilable per-payment via
  `GET /admin/payments/:id/refunds` and `.../settlements` regardless of
  whether the refund originated from a return or a standalone admin
  action.
- Negative: the `OrderStatus` enum is now fairly wide (11 values); any
  new consumer must handle the full union or explicitly narrow it — the
  storefront/admin UIs do this via a single `orderStatusLabel()`-style
  mapping function rather than duplicating the switch statement.
- Negative: mock settlement math (flat 2% fee + 18% GST) is a
  simplification; real Razorpay settlement reports have per-payment-
  method fee schedules. Acceptable for local/dev reconciliation
  visibility; must be replaced by ingesting real settlement
  reports/webhooks before production (tracked for Sprint 17).

## Revisit Triggers

- Split fulfillment (one order → multiple partial shipments with
  independent tracking) becomes a real requirement — the `Shipment`
  model already supports multiple shipments per order at the schema
  level, but `OrdersService.adminCreateShipment` currently assumes one
  shipment moves the whole order to `shipped`; that assumption needs
  revisiting first.
- Returns/exchanges need multi-item partial resolution (e.g. approve 1
  of 3 returned items) — today a `ReturnRequest`/`ExchangeRequest` is
  resolved as a single unit.
- Real Razorpay settlement webhooks are integrated (Sprint 17) —
  replace `recordSettlement()`'s synchronous mock with an async
  ingestion path keyed on Razorpay's settlement `utr`.
