# Sprint 13 Summary — Notifications

Status: **Done**
Plan: `documents/sprint-planning/sprint-13-notifications.md`
Related: [ADR 0013](../decisions/0013-notifications-queue-and-templates.md),
[Architecture and templates](../notifications/architecture-and-templates.md),
[Channel adapters](../notifications/channel-adapters.md),
[Delivery failure runbook](../runbooks/delivery-failure-runbook.md),
[Sprint 13 privacy review](../security/sprint-13-notifications-privacy-review.md),
[Audit dictionary](../admin/audit-log-dictionary.md)

## Outcome

Email + SMS MVP: versioned templates, shopper marketing preferences,
BullMQ send, and durable `DeliveryLog`. API pre-renders; worker only
delivers. Marketing is opt-in; transactional/operational always send.
Checkout enqueue is fire-and-forget.

## What Was Built

### Backend

- `apps/api/src/notifications` — preferences, admin templates
  (CRUD, versions, publish, preview, test-send), delivery list.
- Shared helpers (`packages/shared/src/notification-template.ts`):
  `{{name}}` render, required vars, `allowsNotification`,
  `sanitizePayloadPreview`.
- Worker: queue `notifications`, nodemailer (Mailpit), mock/disabled SMS.
- Job: `{ deliveryLogId, channel, destination, subject, body }`.
- No `notification_queue` table. WhatsApp/push/in-app: enums only.

### Triggers

`AuthService.requestOtp` → `otp.email` / `otp.sms`; payments
`finalizeOrder` → `order.confirmed.email`; `markFailed` →
`payment.failed.email`; `adminCreateShipment` →
`shipment.updated.email`; return request/resolve →
`return.updated.email`; worker low-stock scan →
`inventory.low_stock.email` to `NOTIFICATION_OPS_EMAIL`.

### Admin / storefront

`/notifications/templates`, `/notifications/deliveries`.
Storefront account Notifications tab (marketing opt-in).

### Seed / env

`notifications.seed.ts`: `otp.email`, `otp.sms`,
`order.confirmed.email`, `payment.failed.email`,
`shipment.updated.email`, `return.updated.email`,
`inventory.low_stock.email` (operational), `campaign.promo.email`
(marketing). Permissions `notification:read` / `notification:write`
(`marketing_manager` both; `customer_support` read).

Env: `SMTP_FROM`, `SMS_PROVIDER` (`mock`\|`disabled`),
`NOTIFICATION_QUEUE_CONCURRENCY` (5), `NOTIFICATION_MAX_ATTEMPTS` (5),
`NOTIFICATION_BACKOFF_MS` (2000), `NOTIFICATION_DLQ_RETENTION_DAYS`
(14), `UNSUBSCRIBE_URL`, `NOTIFICATION_OPS_EMAIL`. Existing
`SMTP_HOST` / `SMTP_PORT`.

### API

Prefix `api/v1`. JWT. Swagger tags `me-notifications` /
`admin-notifications`.

| Method | Path | Permission |
| --- | --- | --- |
| GET / PATCH | `/me/notification-preferences` | authenticated shopper |
| GET / POST | `/admin/notifications/templates` | `notification:read` / `write` |
| GET / PATCH | `/admin/notifications/templates/:id` | `notification:read` / `write` |
| POST | `.../templates/:id/versions` | `notification:write` |
| POST | `.../templates/:id/publish` | `notification:write` |
| POST | `.../templates/:id/preview` | `notification:read` |
| POST | `.../templates/:id/test-send` | `notification:write` |
| GET | `/admin/notifications/deliveries` | `notification:read` |

Canonical admin prefix is `/admin/notifications/*`. If an older alias
`/admin/notification-deliveries` appears in a client, treat it as the
same list resource.

## Coverage

- Unit: template render/prefs/redaction (`packages/shared`); enqueue,
  marketing skip, OTP redaction (`notifications.service.spec`); SMTP
  retry + mock SMS (`notifications.processor.spec`); env defaults.
- Storybook: `Admin/TemplateEditorShell`, `Admin/NotificationPreferenceRow`,
  `Admin/DeliveryLogTable`, `Commerce/StatusPill` delivery statuses.
- E2E: `playwright/tests/admin-notifications.spec.ts` (sidebar + axe
  on Templates and Deliveries). Storefront preference save is a unit of
  the account page, not a dedicated Playwright spec.

## Pending / debt

- Apply migration when the API is not locking Prisma generate:
  `pnpm --filter @ecom/api prisma:generate`,
  `pnpm --filter @ecom/api exec prisma migrate deploy`,
  `pnpm --filter @ecom/api prisma:seed`.
- WhatsApp / push / in-app senders — enum only.
- Campaign blast / audience send — template only.
- Real SMS provider — `mock` or `disabled`.
- Delivery-log partitioning — not built.
- Sticky / flag-based send evaluate — N/A.
- Excel/PDF — not built.
- OTP still logged on the API in development (privacy finding #3).

## Definition of Done

- [x] Asynchronous, retryable email/SMS send
- [x] Marketing vs transactional/operational rules
- [x] Versioned, auditable templates
- [x] Delivery logs without OTP in `payloadPreview`
- [x] Queue retries + DLQ retention documented
- [x] ADR 0013, architecture, adapters, runbook, privacy review
