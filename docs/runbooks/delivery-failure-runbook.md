# Delivery Failure Runbook

Status: Complete (Sprint 13)
Audience: On-call / support escalation
Related: [ADR 0013](../decisions/0013-notifications-queue-and-templates.md),
[architecture](../notifications/architecture-and-templates.md),
[channel adapters](../notifications/channel-adapters.md)

Enqueue is fire-and-forget. A missing email does **not** mean checkout
or OTP challenge creation failed. Investigate delivery, not the order
row, unless the domain event itself never ran.

## Inspect DeliveryLog

Admin: `/notifications/deliveries` →
`GET /api/v1/admin/notifications/deliveries`
(`notification:read`). Filters: `status`, `channel`, `templateKey`,
`destination`, `page`, `pageSize`.

```sql
SELECT id, template_key, channel, destination, status, event_type,
       attempt, error_message, payload_preview, created_at, sent_at
FROM delivery_logs
WHERE destination = '<email-or-phone>'
ORDER BY created_at DESC
LIMIT 20;
```

| Status | Meaning |
| --- | --- |
| `queued` | Row written; job not finished (Redis down or worker idle) |
| `sending` | Worker picked the job |
| `sent` | Adapter reported success |
| `failed` | Exhausted retries or hard error |
| `skipped` | Preference block, `SMS_PROVIDER=disabled`, or no destination |

`payloadPreview` is sanitized — OTP fields are `[redacted]`.

## Mailpit (email)

1. Open http://localhost:8025 (Compose Mailpit).
2. Search by `SMTP_FROM` or the destination.
3. If Mailpit has the message but the customer does not, the problem is
   downstream of this app (prod SMTP, spam).
4. If Mailpit is empty and `DeliveryLog` is `queued`/`failed`, check
   worker logs and `SMTP_HOST`/`SMTP_PORT` (`localhost:1025` locally,
   `mailpit:1025` in Compose).

## Redis / BullMQ

Queue name: `notifications`. Worker concurrency:
`NOTIFICATION_QUEUE_CONCURRENCY` (5).

1. Confirm Redis is up (`REDIS_HOST` / `REDIS_PORT`).
2. Confirm the worker process is running (`apps/worker`).
3. Look for failed jobs on queue `notifications` (BullMQ failed set).
4. Retry is automatic: `NOTIFICATION_MAX_ATTEMPTS` (5) with
   `NOTIFICATION_BACKOFF_MS` (2000) between attempts.
5. After max attempts the job stays in the DLQ until
   `NOTIFICATION_DLQ_RETENTION_DAYS` (14). Do not replay by inserting
   a second `DeliveryLog` unless you intend a new send — use a
   `test-send` or re-trigger the domain event.

There is no `notification_queue` table to repair.

## Marketing vs transactional

- Transactional / operational: should send even if the user opted out
  of marketing.
- Marketing: `skipped` if no opt-in or `unsubscribedAt` is set.
  Check `notification_preferences` before assuming a provider outage.

## OTP still in API logs (development)

`AuthService.requestOtp` still logs
`OTP for <destination> via <channel>: <code> (dev-only log)`.
That is **not** stored on `DeliveryLog`. In production, treat API
log access as equivalent to reading the code. Demo accounts also
accept `DEV_DEMO_OTP` (default `123456`) in development only.

## Low-stock ops mail

Worker scan sends `inventory.low_stock.email` to
`NOTIFICATION_OPS_EMAIL`. If ops did not get it: check that
destination, Mailpit, and `DeliveryLog.template_key`.

## Do not

- Manually `UPDATE delivery_logs SET status = 'sent'` to “fix” a
  customer complaint.
- Paste raw OTP codes into audit notes or tickets.
- Enable a real SMS provider by flipping `SMS_PROVIDER` — only
  `mock` and `disabled` are valid this sprint.
