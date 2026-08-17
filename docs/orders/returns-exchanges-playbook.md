# Returns & Exchanges Operations Playbook

Status: Complete (Sprint 9)
Audience: Customer support / operations admins using the admin order
dashboard (`apps/admin/src/app/orders`)
Code: `apps/api/src/orders/orders.service.ts` (`adminResolveReturn`,
`adminResolveExchange`), `apps/api/src/orders/orders-admin.controller.ts`

## Return workflow

```
requested → approved → item_received → refunded
    └─────────────────→ rejected
```

1. **Customer requests a return** (`POST /orders/:id/return`) — only
   allowed for `delivered` orders within the return window (default 7
   days from delivery, see [order lifecycle](./order-lifecycle.md)).
   The customer picks a reason (from `GET /orders/meta/return-reasons`,
   seeded: size issue, quality issue, wrong item, damaged, not as
   described, changed mind, other), the specific line items + quantity
   being returned, optional comments, and optional evidence photo URLs.
   The order moves to `return_requested`.
2. **Admin reviews the request** on the order detail page. Two
   options, via `PATCH /admin/returns/:id`:
   - `{ action: "approve", refundAmount?, note? }` — accepts the
     return. If `refundAmount` is omitted, it defaults to the full
     order total; override it for partial refunds (e.g. one of three
     items).
   - `{ action: "reject", note? }` — declines the return (e.g. outside
     policy, item not eligible). The order reverts to `delivered` so
     the customer can still request an exchange or a fresh return if
     eligible.
3. **Courier pickup / customer ships the item back.** Once the
   warehouse physically receives it: `{ action: "receive" }` moves the
   return to `item_received`. There is no automated inbound scan
   integration yet — this is a manual confirmation step.
4. **Process the refund**: `{ action: "refund", refundAmount?, note? }`.
   This requires the order to have a `captured` payment on file (COD
   orders paid on delivery still have a payment row once confirmed).
   It creates a `RefundRequest` (`status: "completed"`), calls the
   Razorpay refund API in live mode (mocked in dev — see
   [payment incident runbook](../runbooks/payment-incident-runbook.md)),
   and moves the order to `returned` (terminal).

## Exchange workflow

```
requested → approved → item_received → exchanged
    └──────────────────→ rejected
```

Same shape as returns, via `PATCH /admin/exchanges/:id` with
`action: "approve" | "reject" | "receive" | "complete"`. Key
difference: exchanges don't touch `RefundRequest`/`Payment` at all —
`desiredItems` on the `ExchangeRequest` record the customer's requested
replacement SKU(s), but **no new order or shipment is auto-created for
the replacement item today**. Operationally: once `complete` is
called, support must manually create the replacement shipment through
the normal fulfillment flow (`POST /admin/orders/:id/shipments`) if a
brand-new order isn't created for it. This manual hand-off is a known
gap — see Follow-Up Actions in the [Sprint 8/9 security
review](../security/sprint-08-09-payments-orders-security-review.md)
and the Sprint 9 summary's pending-tasks section.

## Guardrails already enforced by the API (don't try to work around them)

- **One open request at a time per order.** `requestReturn`/
  `requestExchange` reject a new request with `ConflictError` while an
  existing return/exchange is `requested`, `approved`, or
  `item_received` for that order. Resolve or reject the open one
  first.
- **Items must have been purchased.** Requested SKUs/quantities are
  validated against the order's frozen `lineItems` snapshot —
  `ValidationError` if a SKU wasn't in the order or the requested
  quantity exceeds what was bought.
- **Action sequence is enforced server-side.** E.g. calling `refund`
  before `receive` throws `ValidationError("Item must be received
  before refunding")`. There is no way to skip a step through the API,
  by design — if a step genuinely needs to be skipped (rare edge case),
  do it via a direct, logged database correction, not by adding a
  bypass to the API.

## Escalation

- **Payment gateway refund failure**: see the [payment incident
  runbook](../runbooks/payment-incident-runbook.md).
- **Return abuse / serial returners**: not yet automated — flag to
  engineering for a future fraud-signals sprint (tracked as a Sprint 9
  pending task, no current sprint owns it).
- **Damaged-in-transit disputes with the courier**: outside this
  playbook's scope; couriers are configured per `Courier` row
  (`apps/api/prisma/seed.ts`) with a `trackingUrlTemplate` for customer
  visibility only — there's no courier claims/API integration yet.
