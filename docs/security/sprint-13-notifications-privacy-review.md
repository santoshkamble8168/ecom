# Sprint 13 Privacy Review — Notifications

Status: Complete
Reviewed: Sprint 13 (templates, preferences, queue send, delivery logs)
Scope: `apps/api/src/notifications`, `apps/worker/src/notifications`,
`packages/shared/src/notification-template.ts`, triggers in auth /
payments / orders / inventory jobs, admin `/notifications/*`,
storefront account Notifications tab
This review did not change application code.

## Summary

Sends carry customer email/phone on `DeliveryLog.destination`. OTP
codes are redacted in `payloadPreview` but can still appear in API
process logs in development. Marketing is opt-in. Findings below are
accepted risks.

## Findings Logged As Accepted Risk

| # | Finding | Severity | Rationale / Plan |
| --- | --- | --- | --- |
| 1 | `DeliveryLog.destination` stores the raw email or phone. Admin list (`notification:read`) includes destination; `customer_support` can read logs. | Medium (PII) | Needed to debug delivery. Do not add a public “list by destination” API. Treat delivery CSV/export as out of scope (YAGNI). |
| 2 | `sanitizePayloadPreview` redacts keys `otpCode`, `code`, `password`, `token`, `secret`, `authorization` (case-insensitive). Other secret-shaped fields (e.g. `otp`) are not in the set. Nested objects are `[omitted]`. | Low | Keep OTP variable name `otpCode`. Do not put secrets in template vars. |
| 3 | `AuthService.requestOtp` logs the plaintext OTP and destination in development (`OTP for … (dev-only log)`). `DEV_DEMO_OTP` bypasses verify for seeded emails when `NODE_ENV=development`. | Medium in shared/dev logs | Accepted for local QA. Must not enable demo bypass or plaintext OTP logs in production. DeliveryLog does not store the code. |
| 4 | Marketing requires opt-in + no `unsubscribedAt`. Transactional/operational always send (OTP, orders, ops). A shopper cannot disable transactional email/SMS via PATCH. | n/a (product) | Correct for sign-in and order mail. Document on the account Notifications tab. |
| 5 | Test-send (`notification:write`) delivers to any `destination` the operator types. Rendered body can include customer-shaped sample vars. | Medium if abused | `marketing_manager` and `admin` only. Audit `notification.test_sent`. Do not test-send production OTPs to personal inboxes with live codes. |
| 6 | Mock SMS logs destination + body on the worker. Same PII surface as Mailpit. | Low in prod if `SMS_PROVIDER=mock` | Set `SMS_PROVIDER=disabled` until a real provider exists. Mock must not be the production SMS path. |
| 7 | Fire-and-forget enqueue: Redis failures are not a customer-visible API error. Missed OTP/order mail is an availability issue, not a leak. | Low | See [delivery runbook](../runbooks/delivery-failure-runbook.md). |
| 8 | No WhatsApp/push/in-app senders. Enum values exist; create DTO allows email/SMS only. | n/a (strength) | Do not add adapters without a consent + provider design. |
| 9 | Worker job payload is rendered `subject`/`body` (may include order numbers, names). Redis/BullMQ operators can read in-flight jobs. | Medium | Restrict Redis access. Jobs expire with the queue; DLQ retained `NOTIFICATION_DLQ_RETENTION_DAYS` (14). |
| 10 | SMTP credentials (`SMTP_USER` / `SMTP_PASSWORD`) must never be written to `DeliveryLog`, audit metadata, or template bodies. | Low if followed | Log transport errors, not the auth config. |

## Strengths Confirmed

- Marketing defaults off (`emailMarketing` / `smsMarketing` false).
- `allowsNotification` blocks marketing without a preference row.
- OTP and similar keys redacted on `payloadPreview`.
- Template mutations and test-send are audited (`notification.*`).
- Shopper PATCH cannot turn off transactional flags.
- No campaign blast / audience export this sprint.
- Enqueue does not block payment/checkout commits.

## PII inventory

| Store | PII | Access |
| --- | --- | --- |
| `delivery_logs.destination` | email / phone | `notification:read` |
| `delivery_logs.payloadPreview` | order refs, names; OTP redacted | `notification:read` |
| Mailpit / mock SMS logs | full rendered message | local/ops only |
| API stdout (dev) | OTP code + destination | developers |
| `notification_preferences` | marketing consent + `unsubscribedAt` | the user + admin DB |

## Follow-up

- [ ] Gate the plaintext OTP log behind `NODE_ENV !== production` (or remove it once Mailpit is the only QA path).
- [ ] Disable `DEV_DEMO_OTP` outside development.
- [ ] Real SMS provider with number hashing/retention policy before production SMS.
- [ ] Expand `SECRET_KEYS` if new template variables look secret-shaped.
