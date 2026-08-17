# Payment Incident Runbook

Status: Complete (Sprint 8)
Audience: On-call engineer / support escalation
Code: `apps/api/src/payments/*`
Related: [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md)
(refund/settlement model), [Sprint 8/9 security
review](../security/sprint-08-09-payments-orders-security-review.md)

## Payment state model, at a glance

```
PaymentStatus: created → pending → authorized → captured → refunded
                                 └→ failed
```

- `Payment` — one row per payment attempt lifecycle (`apps/api/prisma/schema.prisma`).
- `PaymentAttempt` — append-only log of every provider call for a
  payment (retry history).
- `PaymentWebhook` — every inbound Razorpay webhook, keyed
  `@@unique([provider, eventId])` for idempotency, with `signatureValid`
  and `processed` flags.
- `RefundRequest` / `Settlement` — see [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md#decision) points 6–7.

## Incident: Customer says they paid, but order shows unpaid / no order was created

**Do not manually mark the order confirmed via SQL.** Investigate first —
Razorpay may have captured funds where our webhook/client-confirm path
never ran (browser closed mid-redirect, webhook delivery delay/failure).

1. Find the payment: `SELECT * FROM "Payment" WHERE reference = '<pay_ref>' OR "providerOrderId" = '<razorpay_order_id>';`
2. Check `PaymentAttempt` rows for that payment — did a `captured` attempt ever log?
3. Check `PaymentWebhook` for the matching `providerOrderId` — is there a row? `signatureValid`? `processed`?
   - **No webhook row at all**: Razorpay never delivered the webhook, or
     it was delivered before our endpoint existed for that env. Check
     the Razorpay dashboard's webhook delivery log for the order — if
     Razorpay shows `captured` there, this is the "genuinely captured,
     never reconciled" case; go to step 4.
   - **Row exists, `signatureValid: false`**: either a webhook secret
     mismatch (check `RAZORPAY_WEBHOOK_SECRET` in the environment
     actually matches the secret configured in the Razorpay dashboard
     for that webhook endpoint) or a genuine tampering/replay attempt.
     Compare the payload against Razorpay's dashboard copy of the same
     event before assuming malice.
   - **Row exists, `processed: true`, but `Payment.status` is still
     `pending`**: the webhook was for a different `eventType` (e.g.
     `order.paid` instead of `payment.captured`) — check `eventType` and
     confirm `handleRazorpayWebhook`'s `eventType.includes("captured")`
     branch actually matched; if Razorpay changed their event naming,
     this handler needs a matching update.
4. **If Razorpay confirms the payment was genuinely captured** but our
   system never finalized it: call `POST /payments/:id/mock-capture` in
   non-prod, or in prod, replay the exact webhook body captured from the
   Razorpay dashboard's "Retry webhook" feature against
   `POST /payments/webhooks/razorpay` — this is safe and idempotent
   (`PaymentWebhook`'s unique `eventId` guard plus `finalizeOrder`'s
   `existing` check means replaying a webhook is a no-op if it already
   succeeded, and completes the job if it didn't). Do not hand-write the
   `Order`/`Payment` rows.
5. Once resolved, confirm: `Order.status = 'confirmed'`,
   `Payment.status = 'captured'`, a `Settlement` row exists for the
   payment (`recordSettlement` runs synchronously in every capture
   path), and the customer's cart was cleared.

## Incident: Duplicate orders for one checkout

Should not happen — `finalizeOrder` looks up `Order.checkoutId`
(`@unique`) before creating, and both webhook + client-confirm racing
for the same payment will hit the same `existing` check. If you see two
`Order` rows for the same `checkoutId`:

1. This indicates a schema-level uniqueness violation was bypassed
   (e.g. a manual insert, or a code path that doesn't go through
   `finalizeOrder`). Grep `orders.service.ts` and `payments.service.ts`
   for any `prisma.order.create` call outside `finalizeOrder` — there
   should be exactly one.
2. Do not delete either order without checking which one has the
   `captured` `Payment` linked (`Payment.orderId`) — that's the real
   one. The other should be investigated for how it was created before
   removal.

## Incident: Webhook signature verification is failing for all events (potential outage, not attack)

1. Confirm `RAZORPAY_WEBHOOK_SECRET` in the running environment exactly
   matches the secret shown in the Razorpay dashboard for the
   configured webhook URL — a secret rotation on either side without
   updating the other is the most common cause.
2. Check `RazorpayProvider.isMockMode()` — if the environment is
   accidentally running in mock mode against real Razorpay callbacks
   (or vice versa), verification will always fail because mock mode
   skips signature checks in `handleRazorpayWebhook`
   (`!signatureValid && !this.razorpay.isMockMode()`), meaning a
   misconfigured mock flag can mask real failures or reject real
   traffic.
3. If neither, check for a reverse-proxy/CDN body-mutation issue —
   `verifyRazorpayWebhookSignature` HMACs the **raw** request body; any
   middleware that re-serializes JSON before it reaches the handler
   (e.g. a body-parser that doesn't preserve raw bytes) will break every
   signature. `main.ts`/`payments.controller.ts` must receive the raw
   body for the webhook route specifically — confirm this wasn't
   regressed by an unrelated body-parsing change.

## Incident: Need to issue a refund

- **Refund tied to a return**: goes through the [returns & exchanges
  playbook](../orders/returns-exchanges-playbook.md) (`PATCH
  /admin/returns/:id` with `action: "refund"`).
- **Ad-hoc / goodwill refund** (not tied to a formal return — e.g.
  delayed shipment credit, price-match, support goodwill): `POST
  /admin/payments/:id/refunds` with `{ amount?, reason }`
  (`PaymentsService.adminCreateRefund`). Omitting `amount` refunds the
  full payment amount. This requires `payment.status === "captured"` —
  you cannot refund a `pending`/`failed` payment (there's nothing
  captured to return).
- Both paths call `RazorpayProvider.refundPayment` for `razorpay`
  payments (no-op for `cod`, which has no gateway leg) and write to the
  same `RefundRequest` table, so `GET /admin/payments/:id/refunds`
  always shows the complete picture regardless of origin.
- **If the Razorpay refund call itself fails** (gateway timeout/error):
  `adminCreateRefund` will throw before writing any `RefundRequest` —
  safe to retry the admin action once the underlying Razorpay issue is
  resolved; no partial/orphaned refund records are created because the
  provider call happens before the database write.

## Incident: Payment failure spike (multiple customers failing to pay)

1. Check `PaymentAttempt` failure rate over the last hour: `SELECT
   "errorMessage", COUNT(*) FROM "PaymentAttempt" WHERE status =
   'failed' AND "createdAt" > now() - interval '1 hour' GROUP BY
   "errorMessage" ORDER BY 2 DESC;`
2. A concentration of `invalid_signature` failures suggests a
   Razorpay-side key rotation or a frontend build serving a stale
   `RAZORPAY_KEY_ID` — check the deployed frontend env matches the
   current Razorpay key pair.
3. A concentration of gateway timeouts/`5xx` from `RazorpayProvider`
   calls suggests a Razorpay outage — check
   [Razorpay's status page](https://status.razorpay.com) and, if
   confirmed, communicate a temporary payment-degradation banner on the
   storefront (not yet automated — manual action for now, tracked as a
   Sprint 13 (notifications)/Sprint 17 (alerting) follow-up:
   "Alerting for payment failure spikes" was explicitly deferred from
   Sprint 8's scope).
4. There is currently **no automated alert** for this — this runbook
   entry assumes a human noticed via support tickets or manual
   dashboard review. Setting up the alert itself (e.g. a threshold on
   `PaymentAttempt` failure rate) is tracked as outstanding Sprint 8
   technical debt.

## Known gaps (do not attempt to work around these live — flag to engineering)

- Webhook processing is **inline**, not queue-backed — a slow/failing
  webhook handler blocks the HTTP response to Razorpay, and there's no
  automatic retry-with-backoff beyond whatever Razorpay itself retries.
  Deferred from Sprint 8 scope; revisit before production (Sprint 17).
- Settlement records are a **mock approximation** (flat 2% fee + 18%
  GST, synchronous, created at capture time) — not ingested from real
  Razorpay settlement reports/webhooks. Do not treat `Settlement` rows
  as authoritative for real financial reconciliation until this is
  replaced (see [ADR 0009](../decisions/0009-orders-domain-and-fulfillment-state-machine.md), Revisit Triggers).
