# Notifications — Architecture and Templates

Audience: API/worker authors and marketing/ops editing templates.
See [ADR 0013](../decisions/0013-notifications-queue-and-templates.md),
[channel adapters](./channel-adapters.md),
[delivery runbook](../runbooks/delivery-failure-runbook.md).

## Flow

```
Domain event (OTP, payment, order, shipment, return, low-stock)
  → API: load published template + prefs
  → skip if marketing blocked (no opt-in or unsubscribedAt set)
  → render {{variables}} in API
  → insert DeliveryLog (queued) + enqueue BullMQ `notifications`
  → worker: nodemailer or mock SMS
  → DeliveryLog sent | failed | skipped
```

Job payload (`NotificationSendJob`): `{ deliveryLogId, channel, destination, subject, body }`.
Enqueue is fire-and-forget so checkout never fails.

There is no `notification_queue` table. Feature-flag evaluate is not
part of send.

## Schema

Enums: `NotificationChannel` (`email`, `sms`, `whatsapp`, `push`,
`in_app`), `NotificationCategory` (`transactional`, `marketing`,
`operational`), `TemplateStatus` (`draft`, `published`, `archived`),
`DeliveryStatus` (`queued`, `sending`, `sent`, `failed`, `skipped`).

Models: `NotificationTemplate`, `NotificationTemplateVersion`,
`NotificationPreference`, `DeliveryLog`.
Migration: `apps/api/prisma/migrations/20260818000000_sprint13_notifications/`.

## Template syntax

Placeholders are `{{name}}` (optional spaces inside braces). Names are
`[a-zA-Z][a-zA-Z0-9_]*`. Email interpolation HTML-escapes values.
Missing optional vars become empty strings. `requiredVariables` on the
template must be present and non-blank or render/send is rejected
(`assertRequiredVariables`).

Helpers live in `packages/shared/src/notification-template.ts`.

## Versioning

1. Create template → first body is version 1; status starts `draft`
   until publish (seeded keys are published).
2. `POST .../versions` appends a new version and sets the template
   back to `draft`. Sends keep using the last **published** version.
3. `POST .../publish` marks the latest version live (`published`).
4. Archive stops new sends; existing `DeliveryLog` rows stay.

## Preferences

| Category | Rule |
| --- | --- |
| `transactional` / `operational` | Always send if a destination exists |
| `marketing` | Channel opt-in (`emailMarketing` / `smsMarketing`) **and** `unsubscribedAt` is null. No preference row = not opted in |

`GET`/`PATCH /me/notification-preferences`. PATCH accepts marketing
flags only. `UNSUBSCRIBE_URL` is injected for marketing bodies
(default storefront `/account`).

## Seed templates

| Key | Channel | Category | Required vars |
| --- | --- | --- | --- |
| `otp.email` | email | transactional | `otpCode` |
| `otp.sms` | sms | transactional | `otpCode` |
| `order.confirmed.email` | email | transactional | `orderNumber`, `total` |
| `payment.failed.email` | email | transactional | `orderRef` |
| `shipment.updated.email` | email | transactional | `orderNumber` |
| `return.updated.email` | email | transactional | `orderNumber`, `returnStatus` |
| `inventory.low_stock.email` | email | operational | `skuCount` |
| `campaign.promo.email` | email | marketing | `campaignName` |

Seed: `apps/api/prisma/seeds/notifications.seed.ts`. There is no
campaign blast — `campaign.promo.email` is a template + test-send only.

## Triggers

| Event | Template | Notes |
| --- | --- | --- |
| `AuthService.requestOtp` | `otp.email` / `otp.sms` | Channel matches OTP request |
| Payments `finalizeOrder` | `order.confirmed.email` | After capture / COD confirm |
| Payments `markFailed` | `payment.failed.email` | |
| Orders `adminCreateShipment` | `shipment.updated.email` | |
| Return request / resolve | `return.updated.email` | |
| Worker low-stock scan | `inventory.low_stock.email` | Destination `NOTIFICATION_OPS_EMAIL` |

## Admin / storefront

- Admin: `/notifications/templates`, `/notifications/deliveries`
- Storefront account: Notifications tab (marketing opt-in)
- Permissions: `notification:read`, `notification:write`.
  `marketing_manager` has both; `customer_support` has read.

## YAGNI

WhatsApp/push/in-app senders, campaign blast, table partitioning,
sticky rollout, Excel/PDF delivery export.
