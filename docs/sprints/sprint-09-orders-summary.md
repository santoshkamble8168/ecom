# Sprint 9 Summary — Orders

Status: **Done**
Plan: `documents/sprint-planning/sprint-09-orders.md`
Tracker: `documents/sprint-planning/README.md`
Related: [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md),
[Order lifecycle](../orders/order-lifecycle.md),
[Returns & exchanges playbook](../orders/returns-exchanges-playbook.md),
[Invoice numbering](../orders/invoice-numbering.md),
[Sprint 8/9 security review](../security/sprint-08-09-payments-orders-security-review.md)

## Outcome

Sprint 9 delivers full post-purchase order management: an explicit,
tested order state machine; customer self-service (order history,
detail, tracking, cancellation, returns, exchanges, invoices); an admin
order dashboard (status updates, shipment creation, tracking events,
return/exchange approval); and the supporting fulfillment domain
(shipments, couriers, tracking events, invoices, return/exchange
reasons). Built with three parallel workstreams — backend domain,
customer storefront, and admin dashboard — coordinated through a shared
`@ecom/types` contract (`packages/types/src/order.ts`) so all three
landed against the same API shape.

## What Was Built

### Backend (`apps/api/src/orders`)

- **Order state machine** (`policies/order-state-machine.ts`): explicit
  `ALLOWED_TRANSITIONS` lookup table, `assertTransition`/`canTransition`,
  cancellation/return/exchange eligibility (with configurable return/
  exchange windows), invoice/shipment number generators. Fully unit
  tested in isolation (8 cases, no database).
- **`OrdersService`** — the single place all order mutations flow
  through:
  - Customer: `listForUser`, `getDetailForUser`, `cancel`,
    `requestReturn`, `requestExchange`, `getInvoice`/`getInvoiceHtml`,
    `listReturnReasons`/`listExchangeReasons`, `trackByShipmentNumber`
    (public).
  - Admin: `adminList`, `adminGetDetail`, `adminUpdateStatus`,
    `adminCreateShipment`, `adminAddTrackingEvent`,
    `adminResolveReturn`, `adminResolveExchange`, `listCouriers`.
  - Every status change goes through `transition()`, which updates
    `Order.status` and appends an immutable `OrderStatusHistory` row in
    the same call — this is the audited, never-destructively-updated
    order timeline required by the sprint's acceptance criteria.
  - Cancelling an order with an already-captured payment automatically
    creates a pending `RefundRequest` (closing the loop with Sprint 8's
    refund model).
- **Fulfillment domain**: `Shipment`/`ShipmentItem`/`TrackingEvent`/
  `Courier` models, kept deliberately separate from checkout's
  `ShippingMethod`/`ShippingZone` (see [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md), decision 4).
- **Returns & exchanges**: separate `ReturnRequest`/`ExchangeRequest`
  models, each with its own `requested → approved/rejected →
  item_received → refunded|exchanged` sub-workflow driven by an
  intention-revealing `action` parameter rather than raw status writes.
  Guards against duplicate open requests per order and validates
  requested items/quantities against the order's frozen line-item
  snapshot.
- **Invoices**: lazy, idempotent generation (`ensureInvoice`) on first
  access, human-readable numbering derived from the order number
  (`INV-{orderNumber-minus-ECO-prefix}`), rendered as printable HTML.
- Seed data: `Courier` (with per-courier tracking URL templates),
  `ReturnReason`, `ExchangeReason` lookup tables.

### Frontend — Customer (`apps/storefront`)

- Order history and detail integrated into the account page (`/account`
  "Orders" tab, `GET /me/orders`) and a dedicated detail route
  (`/account/orders/[id]`) showing the status timeline, line items,
  shipment/tracking info, and action buttons gated by the
  `OrderDetail.actions` eligibility flags the backend computes
  (`cancellable`, `returnEligible`, `exchangeEligible`, with window
  end-dates).
- Cancellation, return-request, and exchange-request flows (reason
  selection, item/quantity picker, evidence URLs for returns).
- Invoice viewing via authenticated blob-URL fetch of
  `/orders/:id/invoice/view` (can't be a plain `<a href>` since it
  requires a bearer token — invoices carry the customer's address).
- Public shipment tracking page (`/track/[shipmentNumber]`) — no login
  required, mirrors real carrier tracking pages.
- Shared status-label/styling helper (`src/lib/orders.ts`,
  `orderStatusMeta`) so every surface renders the 11-value `OrderStatus`
  union consistently instead of duplicating a switch statement per
  component.

### Frontend — Admin (`apps/admin`)

- Order dashboard (`/orders`) — list with status/customer/date filters
  (`ListOrdersQueryDto` → `adminList`).
- Order detail (`/orders/[id]`) with dedicated components:
  `status-badges.tsx`, `shipment-card.tsx`, `create-shipment-form.tsx`,
  `return-card.tsx`, `exchange-card.tsx` — each wired to the matching
  admin action endpoint (status update, shipment creation, tracking
  events, return/exchange resolution).
- Shared formatting helper (`src/lib/format.ts`) for currency/date
  rendering consistent with the rest of the admin app.

### Database

- Migration `20260817151122_orders_fulfillment_returns`: extends
  `OrderStatus`; adds `OrderStatusHistory`, `Shipment`, `ShipmentItem`,
  `TrackingEvent`, `Courier`, `Invoice`, `ReturnRequest`,
  `ExchangeRequest`, `ReturnReason`, `ExchangeReason`,
  `OrderActorType`, `ShipmentStatus`, `ReturnStatus`, `ExchangeStatus`.
- Indexes on customer, order number, status, shipment number, return
  status, and invoice number per the sprint plan's DB requirements.

### API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/orders` | Customer | List own orders |
| GET | `/orders/:id/detail` | Customer | Order detail + timeline + actions |
| POST | `/orders/:id/cancel` | Customer | Cancel (while eligible) |
| POST | `/orders/:id/return` | Customer | Request a return |
| POST | `/orders/:id/exchange` | Customer | Request an exchange |
| GET | `/orders/:id/invoice` | Customer | Invoice as JSON |
| GET | `/orders/:id/invoice/view` | Customer | Invoice as printable HTML |
| GET | `/orders/meta/return-reasons` | Customer | Return reason options |
| GET | `/orders/meta/exchange-reasons` | Customer | Exchange reason options |
| GET | `/tracking/:shipmentNumber` | Public | Shipment tracking |
| GET | `/admin/orders` | Admin (`order:read`) | Filterable order list |
| GET | `/admin/orders/:id` | Admin (`order:read`) | Full order detail |
| PATCH | `/admin/orders/:id/status` | Admin (`order:write`) | Manual status change |
| POST | `/admin/orders/:id/shipments` | Admin (`order:write`) | Create a shipment |
| POST | `/admin/shipments/:shipmentId/events` | Admin (`order:write`) | Add a tracking event |
| PATCH | `/admin/returns/:id` | Admin (`order:write`) | Approve/reject/receive/refund a return |
| PATCH | `/admin/exchanges/:id` | Admin (`order:write`) | Approve/reject/receive/complete an exchange |
| GET | `/admin/couriers` | Admin (`order:read`) | List active couriers |

Note: `GET /orders/:orderNumber` (order confirmation by order number)
remains in `PaymentsController` from Sprint 8 — the new customer
routes above were deliberately given extra static path segments
(`/detail`, `/meta/...`) so they can never collide with that
single-dynamic-segment route (see [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md) and the Problem
Solving note in this sprint's implementation history).

## Coverage / Quality Gates

- Unit: `order-state-machine.spec.ts` (8 cases — transitions,
  eligibility windows, cancellability).
- Unit/service: `orders.service.spec.ts` (12 cases — ownership checks,
  cancellation eligibility, return item/quantity validation, duplicate
  open-request prevention, admin return→refund action sequence).
- `pnpm turbo run typecheck` — clean across all 13 packages/apps
  (only a pre-existing, unrelated `shipping.policy.spec.ts` Decimal-type
  test fixture issue remains, tracked separately, not introduced by
  this sprint).
- `pnpm turbo run test --filter=@ecom/api` — 68/69 passing; the sole
  failure (`redis.service.spec.ts`) is a pre-existing flaky mock
  assertion unrelated to orders.

## Pending Tasks / Technical Debt

- **Exchanges don't auto-create a replacement shipment.** Once an
  exchange is marked `complete`, support must manually create the
  replacement shipment via the normal fulfillment flow — see the
  [returns & exchanges playbook](../orders/returns-exchanges-playbook.md).
- **Split fulfillment isn't supported operationally** — the schema
  allows multiple `Shipment` rows per order, but `adminCreateShipment`
  assumes one shipment ships the whole order. Revisit if partial
  fulfillment becomes a real requirement (see [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md) Revisit
  Triggers).
- **Returns/exchanges are resolved as a single unit**, not per
  line-item — a return covering 2 of 3 items still resolves/refunds as
  one action; partial refund amount can be overridden manually
  (`refundAmount` param) but there's no per-item state tracking yet.
- **No PDF invoice generation** — invoices render as printable HTML
  only (`Invoice.pdfUrl` exists in the schema, unused). See
  [invoice numbering docs](../orders/invoice-numbering.md).
- **No shipment tracking sync worker** — tracking events are
  admin-entered manually; the sprint plan's "worker job for shipment
  tracking sync" (i.e. polling/webhook ingestion from real courier
  APIs) was not built, since no real courier integration exists yet.
- **No return-abuse/fraud signal detection** — flagged in the returns
  playbook as a future sprint's concern.
- Storybook stories (order card, timeline, shipment tracker, invoice
  view, return reason form, admin order table, status badge) and a
  dedicated Playwright E2E suite for order history/cancel/return/admin
  processing were not built this sprint — the flows are covered by API
  unit/service tests and manual verification, not component-level
  visual regression or browser E2E yet.
- Performance review for order history pagination and admin order
  filters under real data volume was not conducted (current
  implementation is correctness-focused, not load-tested).

## Definition of Done — Checklist

- [x] Feature implemented across frontend (storefront + admin),
      backend, database, API, validation, logging.
- [x] Order history is immutable (`OrderStatusHistory` is append-only,
      enforced by convention — every write goes through `transition()`).
- [x] Cancellation, returns, exchanges obey configurable, tested policy.
- [x] Admin order actions are permission-protected (`@Permissions`,
      `order:read`/`order:write`) — auditability rides on the same
      `OrderStatusHistory`/`AuditLog` trail as other admin actions.
- [x] OpenAPI docs generated from `@ApiTags` + DTO decorators
      (`ApiProperty` present on order DTOs), reachable at `/api/docs`.
- [ ] Storybook stories and dedicated E2E — deferred (see Pending
      Tasks).
- [x] Unit/service tests passing (20 new tests between state machine
      and service specs).
- [x] Docs: lifecycle, returns playbook, invoice numbering (this
      sprint's `docs/orders/*`), sprint summary.
- [x] Security review complete
      (`docs/security/sprint-08-09-payments-orders-security-review.md`).

## References

- Sprint plan: `documents/sprint-planning/sprint-09-orders.md`
- ADR: `docs/decisions/0009-orders-domain-and-fulfillment-state-machine.md`
- Order lifecycle: `docs/orders/order-lifecycle.md`
- Returns & exchanges playbook: `docs/orders/returns-exchanges-playbook.md`
- Invoice numbering: `docs/orders/invoice-numbering.md`
- Security review: `docs/security/sprint-08-09-payments-orders-security-review.md`
