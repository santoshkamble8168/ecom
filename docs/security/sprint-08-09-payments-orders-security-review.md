# Sprint 8/9 Security Review — Payments & Orders

Status: Complete
Reviewed: Sprint 8 (Payments) and Sprint 9 (Orders) — Razorpay/COD
payment lifecycle, webhooks, refunds, settlements, order state
machine, fulfillment, returns/exchanges, invoices
Scope: `apps/api/src/payments`, `apps/api/src/orders`,
`apps/storefront/src/app/{account,track}`, `apps/admin/src/app/orders`

## Summary

These two sprints introduce the most security-sensitive surface in the
platform so far: real money movement (Razorpay payments and refunds),
externally-triggered webhooks, and customer self-service actions
(cancel/return/exchange) that must be strictly scoped to the requesting
user's own orders. This review covers authentication/authorization,
webhook integrity, IDOR/ownership checks, input validation, output
encoding, and financial-state consistency. One real issue (invoice HTML
injection) was found and fixed during this review; the rest are logged
as accepted risks with an owning sprint.

## Findings Fixed During This Review

| # | Finding | Severity | Fix |
| --- | --- | --- | --- |
| 1 | `OrdersService.renderInvoiceHtml` interpolated customer-supplied shipping-address fields (`fullName`, `line1`, `line2`, `city`, `state`, `phone`) and order line-item titles/SKUs directly into an HTML document served to the browser (`GET /orders/:id/invoice/view`), with no escaping. A customer whose checkout address contains `<script>`/HTML markup (address fields are free-text, not validated against an allowlist) would have that markup executed when they view their own invoice — and if a support/admin workflow is later added to preview a customer's invoice HTML, this becomes a stored-XSS vector against staff, not just self-XSS. | Medium | Added an `escapeHtml()` helper (escapes `& < > " '`) and applied it to every interpolated user-controlled field in `renderInvoiceHtml`: invoice/order number, shipping address fields, and item title/SKU/variant label. Numeric fields (prices, quantities) were left unescaped since they're `Decimal`/`number` types incapable of carrying markup. Verified `orders.service.spec.ts` (20/20) and full API typecheck still pass after the change. |

## Findings Logged As Accepted Risk (No Code Change)

| # | Finding | Severity | Rationale / Plan |
| --- | --- | --- | --- |
| 2 | Webhook processing (`PaymentsService.handleRazorpayWebhook`) runs synchronously inline within the HTTP request handler, not on a queue. | Medium | Explicitly deferred in the Sprint 8 plan ("Queue-backed webhook processor (inline handling for now)"). Functionally correct and idempotent today (see Strengths below), but a slow/hanging webhook handler could cause Razorpay to time out and retry, and there's no backpressure control. Revisit before production load (Sprint 17). |
| 3 | Settlement records (`PaymentsService.recordSettlement`) are a synchronous mock approximation (flat 2% fee + 18% GST) computed at capture time, not ingested from real Razorpay settlement webhooks/reports. | Low (financial-accuracy risk, not a security vulnerability per se) | Acceptable for local/dev reconciliation visibility. Must not be treated as authoritative for real payouts. Tracked in [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md) Revisit Triggers for Sprint 17. |
| 4 | Cash on Delivery is disabled at the API layer (`confirmCod` always throws), but the underlying eligibility policy (`assertCodEligible`) and DTOs already exist, meaning re-enabling it is a one-line change that could be made without revisiting whether the eligibility rules (order value cap, etc.) are actually sufficient fraud controls. | Low (process risk) | No immediate action; flagged so a future "enable COD" change doesn't skip a fraud-control review. Documented explicitly in the [Sprint 8 summary](../sprints/sprint-08-payments-summary.md). |
| 5 | `OrdersController` and `PaymentsController` are annotated `@SkipThrottle()`, exempting all their routes — including sensitive mutations like `cancel`, `return`, `exchange`, and the admin refund endpoint — from the global rate limiter. | Low | This matches an established repo-wide convention (`cart`, `checkout`, `catalog`, `discovery`, `storefront`, `product` controllers all do the same — see `app.module.ts`'s comment: high-volume authenticated/SSR-triggered reads are exempted, with stricter `@Throttle()` reserved for public unauthenticated endpoints like OTP). Every mutation here still requires a valid JWT (or, for the webhook, a valid Razorpay signature) — the risk is a single authenticated actor spamming their own account's mutations, not unauthenticated abuse. If abuse is observed, add a per-route `@Throttle()` override rather than removing the blanket exemption (which would also throttle high-volume reads like order history). |
| 6 | `GET /tracking/:shipmentNumber` is intentionally public (no auth) and returns the shipment's status/events/courier and the associated `orderNumber`. Shipment numbers are generated (`generateShipmentNumber`) but not cryptographically unguessable-hard by design intent — they mirror real courier tracking-number UX. | Low | Accepted by design — this mirrors how every real carrier tracking page works (order number + tracking number is a common "receipt" combination people share). No PII beyond `orderNumber` is exposed; customer name/address/phone are not returned by `trackByShipmentNumber`. Confirmed by reading the method's return shape. |
| 7 | `ReturnRequest.evidenceUrls` accepts arbitrary customer-submitted URLs (return evidence photos) with no allowlist/validation beyond DTO-level string checks, and admins click these links from the admin dashboard. | Low | No SSRF risk (URLs are opened client-side in an admin's browser, not fetched server-side), but a malicious URL could still be used for phishing/tracking-pixel purposes against an admin. Recommend the admin UI render these as plain text with a manual "open in new tab, verify domain" affordance rather than an auto-styled trusted link — not yet implemented; low priority given the actor (returning customer) already has an account and order relationship with the store. |
| 8 | Admin order/shipment/return/exchange mutations are audit-trailed via `OrderStatusHistory` (status changes) but not all routed through the repo-wide `AuditLog` (`AuditService`) the way payment actions are (`PaymentInitiated`, `AdminRefundIssued`, etc. do call `auditService.log`; `OrdersService`'s admin methods do not). | Low | `OrderStatusHistory` already captures actor type/ID, from/to status, reason, and timestamp for every transition — functionally equivalent audit coverage for order-status changes specifically. However, non-status admin actions (e.g. adding a tracking event, which doesn't change `Order.status`) aren't captured anywhere. Recommend adding `AuditService.log` calls to `adminAddTrackingEvent`, `adminCreateShipment`, and `adminResolveReturn`/`adminResolveExchange` for parity with the payments module — tracked as a follow-up, not blocking, since `order:write` permission is already required and the underlying return/exchange rows themselves retain full history. |

## Strengths Confirmed

- **Every customer order query is ownership-scoped and returns 404, not 403,
  on a mismatch** (`loadOwnedOrder`: `if (!order || order.userId !== userId)
  throw new NotFoundError(...)`), preventing an attacker from
  distinguishing "order doesn't exist" from "order exists but isn't
  yours" — no order-ID enumeration signal.
- **Webhook idempotency is enforced at the database level**
  (`PaymentWebhook.@@unique([provider, eventId])`) and checked before
  any side effect (`existing?.processed` short-circuits reprocessing),
  so a duplicated or replayed webhook delivery cannot double-finalize
  an order or double-record a settlement.
- **Webhook signature verification happens before any payload is
  trusted for state changes** — `handleRazorpayWebhook` persists the
  raw payload either way (for forensics) but only acts on
  `payment.captured`/`failed` events after `signatureValid` is true
  (except in explicit mock mode, gated by `RazorpayProvider.isMockMode()`,
  which is an environment-level config flag, not attacker-controlled).
- **Payment confirmation via the client path is also signature-verified**
  independently of the webhook path (`verifyRazorpayPaymentSignature`
  in `confirmRazorpayClient`) — a forged client-side "payment succeeded"
  call without a valid Razorpay signature cannot confirm an order.
- **`finalizeOrder` is race-safe across all three capture paths**
  (mock capture, client confirm, webhook) via a `findUnique({ where: {
  checkoutId } })` existence check plus the database's `@unique`
  constraint on `Order.checkoutId` — concurrent capture attempts for
  the same checkout cannot create two orders.
- **Refund amount is bounds-checked server-side**
  (`adminCreateRefund`: `Number(refundAmount) <= 0 ||
  Number(refundAmount) > Number(payment.amount)` throws) and only
  permitted against `captured` payments — an admin cannot refund more
  than was paid or refund a payment that was never captured.
- **Order-state transitions are exhaustively validated** by a pure,
  unit-tested lookup table (`assertTransition`) before any write — no
  admin or customer action can force an order into an invalid state
  (e.g. `pending_payment → delivered` directly).
- **Return/exchange item validation prevents over-claiming**:
  `assertItemsBelongToOrder` checks every requested SKU/quantity
  against the order's frozen `lineItems` snapshot, rejecting requests
  for items/quantities never purchased.
- **All admin order/payment endpoints require explicit RBAC
  permissions** (`@Permissions(PERMISSIONS.ORDER_READ)` /
  `ORDER_WRITE)`) — no admin route in either module relies on "any
  authenticated user" as a fallback.
- **Invoices are gated on order status**: `getInvoice`/`getInvoiceHtml`
  reject `pending_payment`/`failed` orders, so a customer can't fish for
  invoice numbers/amounts on orders that never actually completed.

## Dependency Vulnerability Scan

No new runtime dependencies were introduced by Sprints 8/9 (Razorpay
integration uses `crypto`'s built-in HMAC via the existing
`payment.policy.ts` helpers, not a Razorpay SDK package). The Sprint 0
baseline (`docs/security/sprint-00-security-review.md`) dependency
audit remains the current reference; re-run `pnpm audit
--audit-level=critical` (already CI-gated) before the next sprint's
review.

## Follow-Up Actions

- [ ] Sprint 17: replace mock settlement recording with real Razorpay
      settlement webhook ingestion (finding #3).
- [ ] Sprint 17: move webhook processing to a queue-backed worker
      (finding #2).
- [ ] Before enabling COD: revisit `assertCodEligible`'s fraud-control
      sufficiency (finding #4).
- [ ] Add `AuditService.log` calls to the remaining admin order actions
      that don't change `Order.status` for parity with the payments
      module (finding #8).
- [ ] Consider rendering `ReturnRequest.evidenceUrls` as plain text
      (not auto-linked) in the admin UI (finding #7).
- [ ] Ongoing: re-run `pnpm audit` each sprint per the Sprint 0 baseline.
