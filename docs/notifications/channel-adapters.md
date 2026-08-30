# Notification Channel Adapters

Related: [architecture](./architecture-and-templates.md),
[ADR 0013](../decisions/0013-notifications-queue-and-templates.md).

The worker consumes queue `notifications` and sends the **already
rendered** `subject` / `body`. Adapters do not load templates.

## Email (SMTP / Mailpit)

- Library: `nodemailer` in `apps/worker`.
- Env: `SMTP_HOST` (default `localhost`), `SMTP_PORT` (default `1025`),
  optional `SMTP_USER` / `SMTP_PASSWORD`, `SMTP_FROM`
  (default `ECOM <noreply@ecom.local>`).
- Local: Mailpit in Compose — SMTP `localhost:1025`, UI
  http://localhost:8025. Docker API/worker use `SMTP_HOST=mailpit`.
- Success writes `DeliveryLog.status = sent`, `sentAt`, and
  `providerMessageId` when the transport returns one.
- Failures increment `attempt`, store `errorMessage`, and retry per
  BullMQ (`NOTIFICATION_MAX_ATTEMPTS` default 5,
  `NOTIFICATION_BACKOFF_MS` default 2000).

## SMS (mock | disabled)

`SMS_PROVIDER`:

| Value | Behavior |
| --- | --- |
| `mock` (default) | Log the destination + rendered body; mark `sent`. No carrier. |
| `disabled` | Do not send; `DeliveryLog` → `skipped` with a clear error. |

No Twilio/MSG91 adapter this sprint.

## Future channels (enum only)

`NotificationChannel` includes `whatsapp`, `push`, `in_app`. Creating
a template on those channels is rejected on admin create (DTO allows
`email` \| `sms`). Do not add senders until there is a provider,
consent model, and a seed template.

## Concurrency and DLQ

- `NOTIFICATION_QUEUE_CONCURRENCY` (default 5)
- Failed jobs after max attempts stay in BullMQ’s failed/DLQ set
- `NOTIFICATION_DLQ_RETENTION_DAYS` (default 14)

## Ops identity

- `NOTIFICATION_OPS_EMAIL` — low-stock operational destination
  (default `ops@ecom.local`)
- `UNSUBSCRIBE_URL` — marketing footer link (default
  `http://localhost:3000/account`)
