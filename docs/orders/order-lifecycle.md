# Order Lifecycle & State Machine

Status: Complete (Sprint 9)
Code: `apps/api/src/orders/policies/order-state-machine.ts`,
`apps/api/src/orders/orders.service.ts`
Related: [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md)

## Status enum

`OrderStatus` (`packages/types/src/order.ts`, mirrored in
`apps/api/prisma/schema.prisma`):

```
pending_payment → confirmed → processing → shipped → delivered
                                                          ├─→ return_requested → returned
                                                          └─→ exchange_requested → exchanged
(any of pending_payment / confirmed / processing) → cancelled
pending_payment → failed
```

## Allowed transitions

| From | To |
| --- | --- |
| `pending_payment` | `confirmed`, `cancelled`, `failed` |
| `confirmed` | `processing`, `cancelled` |
| `processing` | `shipped`, `cancelled` |
| `shipped` | `delivered`, `returned` |
| `delivered` | `return_requested`, `exchange_requested` |
| `return_requested` | `returned`, `delivered` (rejected) |
| `exchange_requested` | `exchanged`, `delivered` (rejected) |
| `returned`, `exchanged`, `cancelled`, `failed` | — (terminal) |

Enforced by `assertTransition`/`canTransition` — every write to
`Order.status` in `OrdersService` goes through `transition()`, which
updates the row **and** appends an `OrderStatusHistory` record in the
same call, so the two can never drift.

## Who can trigger which transition

| Transition | Trigger | Actor |
| --- | --- | --- |
| `pending_payment → confirmed` | Payment captured (mock capture, Razorpay client confirm, or webhook) | `system` |
| `confirmed → processing` / `→ shipped` | Admin creates a shipment (`POST /admin/orders/:id/shipments`) | `admin` |
| `shipped → delivered` | Admin adds a `delivered` tracking event, or a manual status PATCH | `admin` |
| `(pending_payment\|confirmed\|processing) → cancelled` | Customer self-service (`POST /orders/:id/cancel`) while still cancellable, or admin manual override | `customer` / `admin` |
| `delivered → return_requested` | Customer requests a return (`POST /orders/:id/return`) | `customer` |
| `delivered → exchange_requested` | Customer requests an exchange (`POST /orders/:id/exchange`) | `customer` |
| `return_requested → returned` | Admin completes the refund step of a return | `admin` |
| `return_requested → delivered` | Admin rejects the return | `admin` |
| `exchange_requested → exchanged` | Admin completes the exchange | `admin` |
| `exchange_requested → delivered` | Admin rejects the exchange | `admin` |

## Eligibility windows (configurable)

- **Cancellable**: any status in `pending_payment`, `confirmed`,
  `processing` — i.e. any time before the order has physically shipped.
  Once `shipped`, self-service cancellation is blocked (`assertCancellable`)
  and the customer is directed to request a return after delivery.
- **Return window**: `ORDER_RETURN_WINDOW_DAYS` (default **7** days)
  from the shipment's `deliveredAt`. Enforced by `assertReturnEligible`.
- **Exchange window**: `ORDER_EXCHANGE_WINDOW_DAYS` (default **7** days)
  from `deliveredAt`. Enforced by `assertExchangeEligible`.

Both windows are surfaced to clients via `OrderDetail.actions` (
`cancellable`, `returnEligible`, `exchangeEligible`,
`returnWindowEndsAt`, `exchangeWindowEndsAt`) so the storefront never
has to reimplement this policy — it just reads the flags.

## Audit trail

Every transition is recorded in `OrderStatusHistory` (`from_status`,
`to_status`, `reason`, `actor_type`, `actor_id`, `created_at`) —
**append-only, never updated or deleted**, satisfying the Sprint 9
acceptance criterion that order history must be immutable. This is
what renders as the order timeline on both the customer order-detail
page and the admin order-detail page.

## Testing

- `apps/api/src/orders/policies/order-state-machine.spec.ts` — 8 pure
  unit tests covering the happy path, rejected skip-transitions,
  terminal-state rejection, cancellability, and both eligibility
  windows.
- `apps/api/src/orders/orders.service.spec.ts` — 12 tests covering
  ownership checks (`NotFoundError` for orders you don't own),
  cancellation eligibility, return item/quantity validation, duplicate
  in-flight request prevention, and the return→refund admin action
  sequence.
