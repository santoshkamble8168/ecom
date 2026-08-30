# ADR 0013: Notifications Queue and Templates

- Status: Accepted
- Date: 2026-08-18
- Sprint: Sprint 13 — Notifications

## Context

Sprint 13 adds email + SMS for OTP, orders, payments, shipments,
returns, low-stock ops alerts, and a marketing sample. Rendering in
the worker would couple senders to Prisma templates. A
`notification_queue` table would duplicate BullMQ. Marketing sent
without opt-in is a compliance failure. WhatsApp, push, in-app,
campaign blasts, and delivery-log partitioning are not needed for
this MVP.

## Decision

**1. API pre-renders; worker only sends.** The API loads the published
template version, validates `requiredVariables`, renders `{{name}}`
placeholders (`@ecom/shared` `renderTemplate`), writes a `DeliveryLog`,
and enqueues BullMQ job `{ deliveryLogId, channel, destination, subject, body }`
on queue `notifications`. The worker does not re-query templates.

**2. BullMQ is the queue; `DeliveryLog` is durable.** There is no
`notification_queue` table. Support and admin list deliveries from
Postgres. BullMQ holds in-flight retries, backoff, and the dead-letter
set (`NOTIFICATION_DLQ_RETENTION_DAYS`, default 14).

**3. Marketing is opt-in; transactional and operational always send.**
`allowsNotification`: marketing requires channel opt-in and
`unsubscribedAt == null`. Transactional and operational send whenever
a destination exists. Shoppers can PATCH marketing flags only
(`emailMarketing`, `smsMarketing`). Feature-flag-style evaluate is
not used for send decisions.

**4. Enqueue is fire-and-forget.** Checkout, payment finalize, and
other domain writes must not fail if Redis or the worker is down.
Failed enqueue is logged on the `DeliveryLog` (or skipped); the
commerce transaction still commits.

**5. Email is SMTP/Mailpit; SMS is mock or disabled.**
`nodemailer` to `SMTP_HOST`/`SMTP_PORT` (Mailpit `localhost:1025`,
UI `:8025`). `SMS_PROVIDER=mock` logs the rendered body;
`disabled` marks the log skipped. WhatsApp / push / in-app exist on
`NotificationChannel` only — no adapters.

**6. Secrets stay out of durable previews.**
`sanitizePayloadPreview` redacts `otpCode` / `code` / `password` /
`token` / `secret` / `authorization` on `DeliveryLog.payloadPreview`.
OTP codes may still appear in API process logs in development
(`AuthService.requestOtp`).

## Consequences

- Operators debug from `DeliveryLog` + Mailpit + Redis/BullMQ, not a
  queue table.
- A published template change does not rewrite already-queued jobs
  (body is frozen on the job).
- Marketing never sends to users without a preference row (treated as
  not opted in).
- Checkout latency is independent of SMTP/SMS provider health.
- Production SMS needs a real provider; mock must not ship as the
  only option.

## Revisit Triggers

- Real SMS (or WhatsApp) provider and inbound webhooks.
- Campaign blast / audience send (not one-off test-send).
- Delivery-log partitioning or archive if volume hurts list queries.
- Remove the development OTP plaintext log.
- Object-storage or Excel/PDF of delivery exports.
