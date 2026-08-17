# Sprint 8 Summary — Payments

Status: **Done**
Plan: `documents/sprint-planning/sprint-08-payments.md`
Tracker: `documents/sprint-planning/README.md`
Related: [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md),
[Payment incident runbook](../runbooks/payment-incident-runbook.md),
[Sprint 8/9 security review](../security/sprint-08-09-payments-orders-security-review.md)

## Outcome

Sprint 8 delivers the full payment domain: Razorpay online payments
(mock-mode for local dev, live-key ready), a payment/attempt/webhook
data model, signature-verified and idempotent webhook processing, and
checkout finalization into a confirmed `Order`. The four items
originally deferred mid-sprint — settlement ledger, refunds
(model + API + admin UI hook), a payment incident runbook, and
OpenAPI/ADR/summary/security docs — were closed out alongside Sprint 9.
Cash on Delivery is modeled in the schema/policy layer
(`assertCodEligible`) but intentionally disabled at the API boundary
(`confirmCod` always throws) pending a business decision on COD risk
controls; this is called out explicitly below, not hidden.

## What Was Built

### Backend (`apps/api/src/payments`)

- `Payment` / `PaymentAttempt` / `PaymentWebhook` Prisma models with
  indexes on reference, provider order/payment IDs, checkout ID, order
  ID, and a `@@unique([provider, eventId])` webhook idempotency key.
- `RazorpayProvider`: order creation, payment signature verification
  (`verifyRazorpayPaymentSignature`), webhook signature verification
  (`verifyRazorpayWebhookSignature`), and — closing a Sprint 8 gap —
  `refundPayment` for issuing gateway refunds (mocked in dev, live API
  call when `RAZORPAY_MODE=live`).
- `PaymentsService`: initiate, retry (with attempt-count-bounded
  eligibility via `canRetryPayment`), mock-capture (dev-only bypass of
  the Razorpay redirect), client-confirmed capture with signature
  verification, and webhook-driven capture/failure — all three capture
  paths converge on a single `finalizeOrder()` to guarantee exactly one
  `Order` per `checkoutId` regardless of which path wins the race.
- Closing a Sprint 8 gap — **`RefundRequest` model + API**:
  `adminCreateRefund` (ad-hoc refunds) plus automatic pending-refund
  creation when `OrdersService.cancel` cancels an order with a captured
  payment (see [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md), decision 6).
- Closing a Sprint 8 gap — **`Settlement` ledger**: `recordSettlement()`
  runs synchronously at every capture point (mock capture, client
  confirm, webhook confirm), computing a mock gross/fee/GST/net
  breakdown and a mock UTR, exposed via `GET /admin/payments/:id/settlements`.
- Webhook handler: JSON-parses defensively, persists every event
  (valid or not) to `PaymentWebhook` before acting on it, replays
  safely (checks `existing?.processed` before re-processing), and logs
  `PaymentWebhookReceived` to the audit trail.

### Frontend (`apps/storefront`)

- Payment step integrated into checkout: method selection, Razorpay
  launch (mock + live), pending/success/failure/retry states, and
  transition into order confirmation — built in the prior checkout
  session and verified working end-to-end during this documentation
  pass (login-gated checkout, address persistence, and account order
  visibility were separately fixed as bug reports ahead of this
  sprint's doc close-out).

### Database

- Migration adding `Payment`, `PaymentAttempt`, `PaymentWebhook`,
  and (Sprint 8 gap closure) `RefundRequest`, `Settlement`,
  `RefundStatus`, `SettlementStatus`.
- Seed data for dev-mode payment settings (mock Razorpay keys).

### API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/payments` | Customer | Initiate a payment for a checkout session |
| GET | `/payments/:id` | Public* | Fetch payment status (*ownership-checked inside) |
| POST | `/payments/:id/retry` | Customer | Retry a failed/expired payment |
| POST | `/payments/:id/mock-capture` | Customer, mock-mode only | Simulate successful capture without a real redirect |
| POST | `/payments/:id/confirm` | Customer | Client-side Razorpay confirm (signature-verified) |
| POST | `/payments/webhooks/razorpay` | Public, signature-verified | Razorpay server-to-server webhook |
| POST | `/checkout/:id/cod` | Public | COD confirmation (currently disabled — throws by design) |
| GET | `/orders/:orderNumber` | Public* | Order confirmation lookup by order number |
| GET | `/admin/payments/:id/refunds` | Admin (`order:read`) | List refunds for a payment |
| POST | `/admin/payments/:id/refunds` | Admin (`order:write`) | Issue an ad-hoc refund |
| GET | `/admin/payments/:id/settlements` | Admin (`order:read`) | List settlement ledger entries for a payment |

## Coverage / Quality Gates

- Unit: `payment.policy.spec.ts` (COD eligibility, retry eligibility,
  order-number generation, signature verification helpers) — passing.
- All new refund/settlement code paths are exercised indirectly through
  `orders.service.spec.ts`'s cancellation tests (auto-refund creation)
  and manually verified against mock Razorpay locally.
- `pnpm turbo run typecheck` — clean across all 13 packages/apps.
- `pnpm turbo run test --filter=@ecom/api` — 68/69 tests passing; the
  one failure (`redis.service.spec.ts`) is a pre-existing, unrelated
  flaky mock assertion, not a payments regression.

## Pending Tasks / Technical Debt

- **Cash on Delivery is modeled but disabled** (`confirmCod` always
  throws `ValidationError`) — the plan/DTO/policy layer exists
  (`assertCodEligible`), but enabling it requires a product decision on
  COD fraud controls (order value caps, pincode serviceability,
  verification call) that hasn't been made. Do not silently enable this
  without revisiting `assertCodEligible`'s current placeholder rules.
- **Webhook processing is inline**, not queue-backed, per the Sprint 8
  plan's explicit deferral — a slow handler blocks Razorpay's webhook
  response. Revisit before production (Sprint 17).
- **Settlement math is a mock approximation** (flat 2% fee + 18% GST),
  not ingested from real Razorpay settlement reports. See
  [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md) Revisit Triggers.
- **No automated alerting** for payment failure spikes — explicitly
  deferred; see the [payment incident runbook](../runbooks/payment-incident-runbook.md)'s
  "Known gaps" section.
- Storybook stories for payment method selector / status panel / retry
  card / COD notice / failure state, and a dedicated E2E suite for the
  Razorpay mock flow, were not completed this sprint (deferred with the
  rest of the QA/Storybook backlog per the sprint plan's original
  deferral note) — the flows are covered by manual verification and the
  storefront checkout Playwright coverage from Sprint 7, but not
  payment-specific component stories.

## Definition of Done — Checklist

- [x] Feature implemented across frontend, backend, database, API,
      validation, logging.
- [x] OpenAPI docs generated from `@ApiTags` + DTO `class-validator`
      decorators, consistent with the rest of the API (no dedicated
      Swagger CLI plugin is configured repo-wide, matching Sprint 2–7
      convention); reachable at `/api/docs`.
- [ ] Storybook stories for payment components — deferred (see Pending
      Tasks).
- [x] Docker/env vars for Razorpay keys, webhook secret, mode.
- [x] Unit tests passing; integration coverage via `orders.service.spec.ts`
      for refund creation; E2E deferred (see Pending Tasks).
- [x] Security review complete
      (`docs/security/sprint-08-09-payments-orders-security-review.md`).
- [x] Sprint summary (this document), ADR
      (`docs/decisions/0009-orders-domain-and-fulfillment-state-machine.md`,
      covers refund/settlement decisions), payment incident runbook.

## References

- Sprint plan: `documents/sprint-planning/sprint-08-payments.md`
- ADR: `docs/decisions/0009-orders-domain-and-fulfillment-state-machine.md`
- Runbook: `docs/runbooks/payment-incident-runbook.md`
- Security review: `docs/security/sprint-08-09-payments-orders-security-review.md`
