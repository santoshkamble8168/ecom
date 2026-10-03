# Pre-production review v1

**Product:** Ecom platform monorepo (`storefront`, `admin`, NestJS `api`, `worker`)  
**Date:** 25 September 2026  
**Verdict:** **Not production-ready.** Catalog, cart, CMS, inventory, admin RBAC, and most order operations are real and wired through to Postgres. Checkout **payment capture is a mock**, several authorization checks **fail open**, and operations (secrets, object storage, SMS, monitoring, backups) are still local-dev defaults.

## Status tracker

**Open: 28 · Done: 11 · Out of scope: 1** (PP-023 — do not build). Update **Track** to `In progress` or `Done` as work lands. **Finding status** is the state recorded in this review (25 Sep 2026).

| ID | Severity | Task | Finding status | Track |
|---|---|---|---|---|
| PP-001 | Critical | Replace mock checkout capture with Razorpay Checkout | Mocked | Done |
| PP-002 | Critical | Razorpay must not default to mock; reject unsigned webhooks | Mocked | Done |
| PP-003 | Critical | Bind Razorpay order id and amount before capture | Partially implemented | Done |
| PP-004 | Critical | Stop logging OTPs; send real SMS for phone login | Partially implemented | Pending |
| PP-005 | High | Order confirmation must fail closed without proof of ownership | Partially implemented | Pending |
| PP-006 | High | Guest checkout and payment reads must require session proof | Partially implemented | Pending |
| PP-007 | High | Verify Razorpay webhooks against the raw body | Partially implemented | Done |
| PP-008 | High | Facebook login plus admin on/off for email OTP, phone OTP, Google, Facebook | Partially implemented | Pending |
| PP-009 | High | Admin shell must require a staff role; empty permissions hide nav | Partially implemented | Pending |
| PP-010 | High | Disabled users and revoked roles must stop working immediately | Partially implemented | Pending |
| PP-011 | High | Move refresh tokens out of `localStorage` | Partially implemented | Done |
| PP-012 | High | CMS preview token must not default to `dev-preview-token` | Demo | Done |
| PP-013 | High | Replace regex HTML sanitizer; add CSP | Partially implemented | Done |
| PP-014 | High | Rate-limit payments, checkout, cart, and OTP by destination | Partially implemented | In progress (non-auth routes done; OTP destination excluded) |
| PP-015 | High | Disable public Swagger in production | Implemented, unsafe in prod | Done |
| PP-016 | High | Report exports via private storage and signed download | Partially implemented | Done |
| PP-017 | High | Upload product images and videos to object storage | Placeholder | Done |
| PP-018 | High | Remove demo accounts, OTP `123456` copy, and seed coupon hints | Demo | Done |
| PP-019 | High | Production deploy, TLS, secrets, Redis auth, worker env | Dev only | In progress (repo safeguards done; deployment pending) |
| PP-020 | Medium | Refresh-token reuse detection | Partially implemented | Pending |
| PP-021 | Medium | Drop localhost from production CORS | Partially implemented | Pending |
| PP-022 | Medium | Gift cards: hide create until redemption exists, or implement spend | Placeholder | Pending |
| PP-023 | Info | AI search and AI recommendations | Out of scope | Out of scope |
| PP-024 | Medium | Public shipment tracking must use unguessable numbers | Public by design | Pending |
| PP-025 | Medium | Stop warehouse delete from cascading the inventory ledger | Implemented, unsafe | Pending |
| PP-026 | Medium | Index hot foreign keys | Partially implemented | Pending |
| PP-027 | Medium | Fix canonical inheritance, sitemap gaps, search `noindex` | Partially implemented | Pending |
| PP-028 | Medium | Storefront CSP and admin security headers | Partially implemented | Pending |
| PP-029 | Medium | PDP/CMS API failures must not become 404s | Partially implemented | Pending |
| PP-030 | Medium | Server-render the first page of product listings | Partially implemented | Pending |
| PP-031 | Medium | Accessible names for account, search, and price filters | Partially implemented | Pending |
| PP-032 | Medium | Admin error boundary | Partially implemented | Pending |
| PP-033 | Medium | Marketing unsubscribe URL; reject unimplemented channels | Partially implemented | Pending |
| PP-034 | Medium | Error tracking, metrics, and a tested backup restore | Placeholder | Pending |
| PP-035 | Medium | Tests for the payment and money path | Partially implemented | Pending |
| PP-036 | Low | Coupon client validation; color-filter comment; wishlist delete check | Partially implemented | Pending |
| PP-037 | Low | Timing-safe OTP compare and channel-specific destination format | Partially implemented | Pending |
| PP-038 | Low | Account pages protected only on the client | Partially implemented | Pending |
| PP-039 | Info | Stock and coupon side effects must not be swallowed after capture | Partially implemented | Pending |
| PP-040 | Info | Review high dependency advisories before launch | Partially implemented | Pending |

**By severity (open):** Critical 1 · High 8 · Medium 15 · Low 3 · Info 2 (plus 1 info item out of scope). Razorpay PP-001, PP-002, PP-003, and PP-007 are done in code. Local development still uses `RAZORPAY_MODE=mock` until test keys are set.

**Do first (section A):** PP-018, PP-004, PP-012, PP-008, then PP-005, PP-006, PP-017, PP-019. Razorpay PP-001, PP-002, PP-003, and PP-007 are done.

**Method:** Traced flows across storefront/admin pages, Nest controllers/services, Prisma schema, worker jobs, Docker/CI, and env schema. This pass did **not** boot the stack or click through a live browser. A feature is marked complete only when the UI, API, persistence, and external side effect all exist. UI that calls a mock endpoint is marked **Mocked**.

**What is solid (do not treat as gaps):**

- Money is `Decimal(10,2)`, not floats.
- Global `ValidationPipe` (whitelist + forbid unknown fields), Helmet, hashed OTP challenges, hashed refresh tokens, webhook event idempotency, checkout idempotency keys.
- Admin API routes use `@Permissions`. Customer addresses and owned orders are scoped by `userId`.
- Raw SQL uses Prisma tagged templates (parameterized).
- Storefront has metadata, JSON-LD, `robots.ts`, HTTPS middleware, and security headers (no CSP).
- CI runs typecheck, lint, unit/e2e tests, a production `turbo build`, and `pnpm audit --audit-level=critical`.
- Launch checklist already exists at `docs/launch/checklist.md` and is still unchecked.

**Product decisions (25 Sep 2026):**

1. **Login (in scope).** Customers must be able to sign in with mobile OTP, Google, and Facebook. Each method is an admin setting (on/off), not a code change.
2. **AI (out of scope).** Semantic search, AI recommendations, and any other model-backed feature are not part of this release. Leave those flags off. Do not build a provider.
3. **Product media (in scope).** Images are not stored as files today (see PP-017). Products must support uploaded images and videos.
4. **First implementation target.** Dummy data, demo copy, and unfinished configuration (mock OTP/SMS, mock payments flags, preview token, seed coupons, auth-method settings) are the first work. Feature work that depends on that config comes after.

---

## Findings

### PP-001 — Storefront checkout never charges a real gateway

| | |
|---|---|
| **Severity** | Critical |
| **Category** | Payments / Business logic |
| **Location** | `apps/storefront/src/app/checkout/page.tsx` `handlePlaceOrder`; `apps/storefront/src/lib/payments.ts` `mockCapturePayment`; `apps/api/src/payments/payments.controller.ts` `POST payments/:id/mock-capture` |
| **What is wrong** | After `placeOrder` and `initiatePayment`, the UI calls `mockCapturePayment`, which hits the mock-capture API and marks the payment captured. |
| **Why it matters** | Every “paid” order is free. There is no Razorpay Checkout, no customer payment, and no signature confirm. |
| **Current behavior** | Logged-in user accepts terms → order is created and payment is auto-captured. UI shows “Payment successful”. COD helpers exist; the page tells users COD is unavailable. |
| **Expected** | Razorpay Checkout (or hosted flow) → `POST /payments/:id/confirm` with signature, plus a verified webhook. Mock capture must 404 when `NODE_ENV=production`. |
| **Status** | **Mocked** |
| **Fix** | Load Razorpay.js with the key returned by initiate; on success call `confirmRazorpay` (after PP-003). Gate `mock-capture` so it does not exist in production. |
| **Depends on** | `payments.service.ts` `mockCapture`, `razorpay.provider.ts` |
| **Verify** | Place an order against Razorpay test mode. Dashboard shows a real payment. Mock route returns 404 with production env. |

### PP-002 — Razorpay defaults to mock and accepts unsigned webhooks

| | |
|---|---|
| **Severity** | Critical |
| **Category** | Payments / Security |
| **Location** | `apps/api/src/payments/policies/payment.policy.ts` (`RAZORPAY_MODE ?? "mock"`); `razorpay.provider.ts` `isMockMode`; `payments.service.ts` `handleRazorpayWebhook` |
| **What is wrong** | Mock is the default. Missing `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` also forces mock. In mock mode an invalid webhook signature is **not** rejected. Those keys are **not** in `packages/config/src/env.ts`, so production can boot without them. Fallback secrets are `rzp_test_mock_key` / `mock_razorpay_secret`. |
| **Why it matters** | Anyone who can reach the webhook can forge `payment.captured` and confirm orders. A production deploy that forgets keys silently stays in mock. |
| **Current behavior** | `if (!signatureValid && !this.razorpay.isMockMode())` throws; mock continues and finalizes the order. |
| **Expected** | Production boot fails unless mode is `live` or `test` and key id, key secret, and webhook secret are set. Unsigned webhooks always fail. |
| **Status** | **Mocked** |
| **Fix** | Add Razorpay vars to `apiEnvSchema` with a production refinement. Never skip signature checks. Remove hardcoded secrets. |
| **Depends on** | `.env.example` `RAZORPAY_MODE=mock`, webhook controller |
| **Verify** | `NODE_ENV=production` with empty keys must fail boot. POST a webhook with no signature against a pending payment; expect 400 and no order. |

### PP-003 — Client payment confirm does not bind the Razorpay order

| | |
|---|---|
| **Severity** | Critical |
| **Category** | Payments / Security |
| **Location** | `apps/api/src/payments/payments.service.ts` `confirmRazorpayClient` (around lines 220–260) |
| **What is wrong** | HMAC is checked for the IDs in the request body, then the **local** payment is marked captured. `params.razorpayOrderId` is never compared to `payment.providerOrderId`. Amount is not re-checked. The update then **overwrites** `providerOrderId` with the attacker-supplied id. |
| **Why it matters** | A valid signature from a cheap Razorpay order can capture a different, larger local payment. |
| **Current behavior** | Any caller who can load the payment (see PP-005) and possesses any valid signature finalizes that payment. |
| **Expected** | Reject unless `razorpayOrderId === payment.providerOrderId`, payment is still payable, and amount matches. |
| **Status** | **Partially implemented** (signature helper itself uses `timingSafeEqual`) |
| **Fix** | Add the equality checks before `finalizeOrder`. Do not overwrite `providerOrderId` from the client. Prefer webhook as source of truth. |
| **Depends on** | `payment.policy.ts` `verifyRazorpayPaymentSignature`, storefront confirm client (not wired today; mock path skips this) |
| **Verify** | Create two payments. Pay only the smaller Razorpay order. POST that signature against the larger payment id. Must fail. |

### PP-004 — Login OTP is logged and SMS is not a real channel

| | |
|---|---|
| **Severity** | Critical |
| **Category** | Authentication / Notifications |
| **Location** | `apps/api/src/auth/auth.service.ts` `requestOtp` (line 55); `apps/worker/src/notifications/sms.adapter.ts` `sendSms`; `packages/config/src/env.ts` `SMS_PROVIDER` |
| **What is wrong** | The OTP is written to logs in cleartext (`OTP for ${destination} ...: ${code}`). Email delivery is a notification enqueue over SMTP that defaults to `localhost:1025` (Mailpit) with `secure: false`. SMS provider enum is only `mock` \| `disabled` (default `mock`), which logs the body and returns `mock-sms-*` as if sent. |
| **Why it matters** | **Decision:** mobile OTP login is in scope. The API already accepts `OtpChannel.sms` and stores the phone on the user, but the SMS adapter only mocks a send. Codes also sit in logs (account takeover if logs leak). |
| **Current behavior** | Challenge is hashed, expires in 10 minutes, max 5 attempts (that part is real). Email enqueue uses SMTP defaulting to Mailpit. SMS logs the body and returns `mock-sms-*`. |
| **Expected** | No OTP in logs. Real SMS provider when phone login is enabled in admin (PP-041). Email OTP stays available and is also admin-toggleable. `SMS_PROVIDER=mock` must not boot in production. |
| **Status** | **Partially implemented** (phone challenge storage real; delivery mocked). **Target:** real SMS. |
| **Fix** | Delete the log line. Add a real SMS provider behind admin configuration. Require SMTP when email OTP is enabled. |
| **Depends on** | `email.adapter.ts`, templates `otp.email` / `otp.sms`, PP-018, PP-041 |
| **Verify** | With phone login enabled, request an OTP to a real number. The handset receives it. Logs contain no code. With phone login disabled in admin, the SMS route returns 403. |

### PP-005 — Order confirmation is public if you know the order number

| | |
|---|---|
| **Severity** | High |
| **Category** | Authorization / Privacy |
| **Location** | `apps/api/src/payments/payments.service.ts` `getOrderConfirmation`; payments controller `GET` orders (public) |
| **What is wrong** | Ownership is checked only when **both** sides of the comparison exist. No user and no `sessionId` returns the order. A logged-in user can also read a guest order (`order.userId` null). Order numbers are `ECO` + date + 6 digits. |
| **Why it matters** | Totals, payment status, and confirmation details leak. Enumeration is practical. |
| **Current behavior** | `GET /api/v1/orders/:orderNumber` with no auth succeeds. |
| **Expected** | Require the owning user, a matching guest `sessionId`, or a signed confirmation token. Missing proof is 404. |
| **Status** | **Partially implemented** |
| **Fix** | Fail closed before returning `toOrderConfirmation`. |
| **Depends on** | `apps/storefront/src/app/order/confirmation/page.tsx` |
| **Verify** | Place an order. Fetch it with curl and no `Authorization` or `sessionId`. Expect 404. |

### PP-006 — Guest checkout and payment access skips session proof

| | |
|---|---|
| **Severity** | High |
| **Category** | Authorization |
| **Location** | `apps/api/src/checkout/checkout.service.ts` `loadAuthorizedSession`; `PaymentsService.loadCheckout` |
| **What is wrong** | Session mismatch is enforced only when the client **sends** `sessionId` and the row has one. Omitting `sessionId` authorizes a guest checkout by UUID alone. |
| **Why it matters** | Checkout UUIDs in logs, analytics, or referrers expose address and line items and can advance payment. |
| **Current behavior** | Guest `GET /checkout/:id` without `sessionId` succeeds. |
| **Expected** | Guest access always requires the matching `sessionId`. |
| **Status** | **Partially implemented** |
| **Fix** | If `!userId`, require `sessionId === session.sessionId`. |
| **Depends on** | Cart session cookie/header the storefront already sends |
| **Verify** | Create a guest checkout. Repeat the GET without the session header. Expect 404. |

### PP-007 — Live Razorpay webhook HMAC will not match the raw body

| | |
|---|---|
| **Severity** | High |
| **Category** | Payments |
| **Location** | `apps/api/src/main.ts` `NestFactory.create` (no `rawBody: true`); payments webhook handler |
| **What is wrong** | Signature verification falls back to `JSON.stringify(req.body)`. Razorpay signs the exact bytes. |
| **Why it matters** | After PP-002 is fixed, legitimate webhooks fail. Capture would depend on the client confirm path (PP-003). |
| **Current behavior** | `req.rawBody` is undefined. |
| **Expected** | `NestFactory.create(AppModule, { rawBody: true })` and verify only that buffer. Reject if it is missing in live mode. |
| **Status** | **Partially implemented** |
| **Fix** | Enable raw body; pass the buffer into `handleRazorpayWebhook`. |
| **Depends on** | PP-002, PP-003 |
| **Verify** | Replay a Razorpay test webhook with the dashboard signature. Expect `signatureValid: true` and a captured payment. |

### PP-008 — Google sign-in is partial; Facebook does not exist; methods are not admin settings

| | |
|---|---|
| **Severity** | High |
| **Category** | Authentication |
| **Location** | `apps/api/src/auth/auth.service.ts` `verifyGoogleIdToken`, `googleAuth`; `schema.prisma` `enum OAuthProvider { google }`; admin settings (no auth-method toggles) |
| **What is wrong** | Google `aud` is checked only if `GOOGLE_CLIENT_ID` is set. `email_verified` is not required. Token check uses the tokeninfo endpoint. Storefront has no Google button. **Facebook is not in the provider enum, API, or UI.** Nothing in admin can turn email OTP, phone OTP, Google, or Facebook on or off. |
| **Why it matters** | **Decision:** all four methods are in scope and must be configurable in admin. Empty Google client id can accept another app’s ID token. Facebook cannot be offered at all. |
| **Current behavior** | Email and SMS OTP endpoints exist. Google endpoint exists and is always on if called. Facebook is absent. |
| **Expected** | Admin settings: `emailOtp`, `phoneOtp`, `google`, `facebook`. Storefront renders only enabled methods. Disabled methods return 403. When Google or Facebook is on, client id/secret are required and tokens must match audience plus verified email. |
| **Status** | **Partially implemented** (email OTP + Google API). Phone OTP delivery is mocked (PP-004). Facebook is **missing**. Admin toggles are **missing**. |
| **Fix** | Add `facebook` to `OAuthProvider`. Verify Facebook tokens server-side. Persist the four toggles in `Setting`. Gate `requestOtp` and OAuth routes on those flags. Storefront login reads the public config. |
| **Depends on** | PP-004 (real SMS when phone OTP is enabled), `GOOGLE_*` env, new `FACEBOOK_*` secrets (server-only, not `NEXT_PUBLIC_`) |
| **Verify** | Turn each method off in admin and confirm the storefront hides it and the API rejects it. Turn Google and Facebook on and complete a login. A token with the wrong `aud` returns 401. |

### PP-009 — Admin shell does not require a staff role

| | |
|---|---|
| **Severity** | High |
| **Category** | Authorization / UX |
| **Location** | `apps/admin` auth guard (token + `/me` only); sidebar `useVisibleNav` |
| **What is wrong** | Any valid customer JWT can open the admin UI. When the permission set is empty, the sidebar renders **all** nav items. |
| **Why it matters** | API RBAC still blocks mutations, but customers see internal navigation and can probe admin routes. Empty-permission fallback is the wrong default. |
| **Current behavior** | `customer@ecom.local` can pass the login guard on port 3001. |
| **Expected** | Guard requires a staff permission (for example admin access). Empty permissions hide every item and redirect to login. |
| **Status** | **Partially implemented** (API permissions are real) |
| **Fix** | Check permissions in the guard before rendering the shell. |
| **Depends on** | `apps/admin/src/lib/api.ts` token storage |
| **Verify** | Log in as the seeded customer on the admin origin. Expect redirect to login and no admin API data. |

### PP-010 — Disabled users and revoked roles keep working until JWT expiry

| | |
|---|---|
| **Severity** | High |
| **Category** | Authorization |
| **Location** | JWT strategy `validate`; `PermissionsGuard`; `AuthService.issueTokens` |
| **What is wrong** | Roles are taken from the access token. `User.status` is not loaded. Permission names are resolved from those role names. |
| **Why it matters** | Suspending a user or removing a role does nothing until the 15-minute access token expires. Refresh can mint another token from stored roles if those are also stale. |
| **Current behavior** | Bearer token remains valid after a status change. |
| **Expected** | `validate` loads the user from the database, rejects non-active users, and uses current roles. |
| **Status** | **Partially implemented** |
| **Fix** | Database lookup on each authenticated request (or a short permission cache keyed by user version). |
| **Depends on** | `RefreshToken`, `User.status` |
| **Verify** | Issue a token, set user `suspended`, call an admin endpoint before TTL. Expect 401. |

### PP-011 — Tokens live in `localStorage`

| | |
|---|---|
| **Severity** | High |
| **Category** | Authentication / XSS |
| **Location** | `apps/storefront/src/lib/auth.ts`; `apps/admin/src/lib/api.ts` |
| **What is wrong** | Access and refresh tokens (refresh TTL default 30 days) are stored in `localStorage` and sent as `Authorization: Bearer`. |
| **Why it matters** | Any XSS (see PP-013) steals a long-lived session. CSRF is not required for this design, and there is no CSRF layer if you later switch to cookies. |
| **Current behavior** | DevTools Application storage shows `ecom_*` tokens. |
| **Expected** | Refresh token in an `httpOnly`, `Secure`, `SameSite` cookie; access token in memory; rotation with reuse detection (PP-020). |
| **Status** | **Partially implemented** |
| **Fix** | Cookie-based refresh issued by the API. Keep Bearer only if XSS surface is tightly locked (CSP + sanitizer). |
| **Depends on** | CORS `credentials: true` already set |
| **Verify** | After login, `localStorage` has no refresh token. Cookie is httpOnly. |
| **Resolution** | Browser apps send `X-Ecom-Client: storefront\|admin`. With that header, login/refresh set an `httpOnly` cookie (`ecom_rt_storefront` / `ecom_rt_admin`, path `/api/v1/auth`) and omit `refreshToken` from the body; without it the body contract is unchanged for API clients. Access token is held in memory and restored via `/auth/refresh` on load; `localStorage` keeps only a non-credential session hint. Legacy stored tokens are exchanged once, then deleted. Cookie env: `AUTH_COOKIE_SAMESITE` (default `lax`; use `none` + HTTPS if storefront/admin and API are cross-site), `AUTH_COOKIE_DOMAIN`, `AUTH_COOKIE_SECURE` (defaults to on in production). Reuse detection remains PP-020. |

### PP-012 — CMS preview token defaults to `dev-preview-token`

| | |
|---|---|
| **Severity** | High |
| **Category** | Security / CMS |
| **Location** | `apps/api` CMS preview (`getPreviewBySlug`); `apps/api/.env.example` `CMS_PREVIEW_TOKEN`; storefront `pages/[slug]/preview` |
| **What is wrong** | Preview of draft/scheduled/archived pages uses a shared token. It is outside the Zod env schema and falls back to a documented dev value. |
| **Why it matters** | Unpublished content, including unreleased pricing or campaigns, is world-readable if the env var is forgotten. |
| **Current behavior** | `GET /cms/pages/:slug/preview?token=dev-preview-token` works when unset. |
| **Expected** | Production refuses to boot without a high-entropy token. No default. |
| **Status** | **Demo** |
| **Fix** | Required secret in production schema. Rotate the example value. |
| **Depends on** | Storefront preview page |
| **Verify** | Production env without the variable fails boot. Wrong token returns 404. |

### PP-013 — HTML sanitizer is a regex, then injected as HTML

| | |
|---|---|
| **Severity** | High |
| **Category** | XSS |
| **Location** | `apps/api/src/common/utils/sanitize-html.ts`; `packages/ui` `RichHtml` (`dangerouslySetInnerHTML`) |
| **What is wrong** | CMS/blog HTML is cleaned with regular expressions. The module itself is not a parser. Storefront renders the result as HTML. Combined with PP-011 this is account takeover. |
| **Why it matters** | Editors (or a compromised editor account) can ship markup that runs in customer browsers. |
| **Current behavior** | Allowlist-style regex stripping. Invoice HTML uses a separate `escapeHtml` path (that one is fine). |
| **Expected** | A real sanitizer (DOMPurify or equivalent) plus a Content-Security-Policy. |
| **Status** | **Partially implemented** |
| **Fix** | Replace the regex cleaner. Add CSP on the storefront (PP-028). |
| **Depends on** | Blog and CMS page renderers |
| **Verify** | Save a page containing known bypasses (`img` event handlers, `javascript:` URLs). Storefront must not execute them. |

### PP-014 — Payment, checkout, and cart routes skip rate limits

| | |
|---|---|
| **Severity** | High |
| **Category** | Abuse / API |
| **Location** | `payments.controller.ts`, `checkout.controller.ts`, `cart.controller.ts` `@SkipThrottle()`; also catalog, discovery, CMS, blog, analytics, recommendations, marketing |
| **What is wrong** | Global throttle is 60 req/min in production, but the payment and content surfaces opt out entirely. OTP routes have their own limits (5 and 10 per 10 minutes per IP only). |
| **Why it matters** | Webhook floods, checkout creation, order-number guessing, and OTP spraying across IPs are cheap. There is no per-destination OTP cooldown. |
| **Current behavior** | Bursts of public GETs do not return 429. |
| **Expected** | Throttle anonymous reads and all writes. Per-email/phone OTP limit. Leave skip only for health checks. |
| **Status** | **Partially implemented** |
| **Fix** | Remove blanket `@SkipThrottle` from payments and checkout. Add destination keys in `requestOtp`. |
| **Depends on** | `ThrottlerGuard` in `app.module.ts` |
| **Verify** | Burst `POST /auth/otp/request` for one email from several IPs. Expect 429. |

### PP-015 — Swagger is public in every environment

| | |
|---|---|
| **Severity** | High |
| **Category** | Security / Deployment |
| **Location** | `apps/api/src/main.ts` `SwaggerModule.setup` → `/api/v1/docs` |
| **What is wrong** | Full API documentation, including admin routes, is mounted unconditionally. |
| **Why it matters** | It is a map for authorization bugs (PP-005, PP-006) and unauthenticated webhook calls. |
| **Current behavior** | Docs load without a credential. |
| **Expected** | Disabled when `NODE_ENV=production`, or behind admin auth and not on the public hostname. |
| **Status** | **Fully implemented** (undesired in production) |
| **Fix** | Guard the setup call with an env flag defaulting off in production. |
| **Depends on** | None |
| **Verify** | Production process does not listen on `/api/v1/docs`. |

### PP-016 — Report exports are local files and the API returns the server path

| | |
|---|---|
| **Severity** | High |
| **Category** | Files / Privacy |
| **Location** | `packages/config/src/env.ts` `EXPORT_STORAGE_PATH` default `./tmp/exports`; `apps/worker/src/admin-jobs/admin-jobs.service.ts`; `apps/api/src/reports/reports.service.ts` |
| **What is wrong** | CSVs are written to local disk. Job responses include `filePath`. There is no authenticated download stream. |
| **Why it matters** | Containers lose `./tmp` on restart. A returned filesystem path leaks layout and is useless across instances. Exports can contain customer PII. |
| **Current behavior** | Worker writes a file; admin sees a job record, not a safe download. |
| **Expected** | Private object storage, short-lived signed URL, no server paths in JSON. |
| **Status** | **Partially implemented** |
| **Fix** | Upload to the bucket (PP-017) and add `GET /admin/reports/exports/:id/download` with permission checks. |
| **Depends on** | Admin reports page |
| **Verify** | Export orders. Download works after a worker restart. Response JSON has no absolute path. |

### PP-017 — Product images and videos are URL strings, not stored files

| | |
|---|---|
| **Severity** | High |
| **Category** | Files / Catalog |
| **Location** | `ProductMedia` in `schema.prisma` (`url`, `type` `image` \| `video`); `catalog.service.ts` `addMedia`; `AddProductMediaDto` (`url`, `altText`, `sortOrder` only); MinIO in `docker-compose.yml` |
| **Where files are stored today** | **Nowhere.** Postgres stores a URL string on `product_media.url`. `addMedia` never receives bytes and never sets `type`, so every row stays the default `image`. MinIO is running in local Docker (`MINIO_*` env) and **no API code uploads to it**. Banners and CMS sections are the same pattern (`imageUrl` string). Storefront `next.config` allows images from `localhost:9000` and Unsplash, which only matters if someone pastes those URLs. |
| **What is wrong** | There is no upload, size limit, content-type check, or video pipeline. The schema already allows `MediaType.video`, but the admin DTO and `addMedia` cannot set it. |
| **Why it matters** | **Decision:** product media must include uploaded images and videos. A pasted URL is not that, and it breaks when the third-party host disappears. |
| **Current behavior** | Admin submits a URL. The storefront renders that URL. Videos cannot be attached through the API. |
| **Expected** | Authenticated upload to object storage (MinIO now, S3-compatible in production). Persist the object URL on `ProductMedia` with `type` `image` or `video`. Enforce type and size. Storefront plays video on the PDP. |
| **Status** | **Placeholder** (schema ready for video; storage and upload missing). **Target.** |
| **Fix** | Upload API that writes the object, then `productMedia.create` with `url` and `type`. Do not keep MinIO as an unused container. |
| **Depends on** | `docs/decisions/0007-minio-for-object-storage.md`, storefront PDP media component |
| **Verify** | Upload a JPEG and an MP4 from admin. Both objects exist in the bucket. PDP shows the image and plays the video. Response is not a hand-pasted Unsplash URL. |

### PP-018 — Production UI advertises demo accounts and seed coupons

| | |
|---|---|
| **Severity** | High |
| **Category** | Demo / UX |
| **Location** | `apps/storefront/src/app/account/page.tsx`; `apps/admin/src/app/login/page.tsx`; `apps/storefront/src/app/cart/page.tsx`; `apps/api/src/auth/demo-accounts.ts`; `apps/api/prisma/seed.ts` |
| **What is wrong** | Account and admin login copy tell users to use `customer@ecom.local` / `admin@ecom.local` and OTP `123456`. Cart copy says `Try: WELCOME10, FLAT100, FREESHIP`. Demo OTP bypass is correctly limited to `NODE_ENV===development`, but the copy is not. |
| **Why it matters** | If seed users exist in production, the documented OTP is the bypass. Even if seed is skipped, customers see a developer backdoor. Seed coupons are live discounts if seeded. |
| **Current behavior** | Hints render in every environment. Dev bypass accepts `123456` for those emails. |
| **Expected** | No demo copy outside local development. Production database is not seeded with demo users or open coupons. |
| **Status** | **Demo** |
| **Fix** | Render hints only in development. Document that `prisma:seed` is forbidden on production. |
| **Depends on** | `DEV_DEMO_OTP` |
| **Verify** | Production build of account and cart shows no demo emails, OTP, or coupon codes. Dev OTP fails when `NODE_ENV=production`. |

### PP-019 — No production deploy, TLS, or secret handling

| | |
|---|---|
| **Severity** | High |
| **Category** | Deployment |
| **Location** | `infrastructure/docker/docker-compose.yml`; `infrastructure/nginx/nginx.conf`; `apps/*/Dockerfile`; `.env.example` |
| **What is wrong** | Compose is a local stack: Postgres `ecom/ecom`, MinIO `ecomminio` / `ecomminio123`, Meilisearch `devMasterKeyChangeMe` and `MEILI_ENV=development`. Nginx listens on port 80 only. API, worker, storefront, and admin images have no `HEALTHCHECK` and no non-root user. Worker service environment sets `REDIS_HOST` and not `DATABASE_URL` or SMTP. BullMQ connects to Redis without `REDIS_PASSWORD`. There is no Vercel/Kubernetes/production compose. |
| **Why it matters** | Shipping this compose file is an open database and an open search index. The worker profile cannot run jobs that need Postgres. |
| **Current behavior** | `pnpm docker:up` starts local dependencies. Apps are behind a compose profile. |
| **Expected** | Separate production manifests, secrets manager, TLS, Redis AUTH, healthchecks, non-root, full worker env. |
| **Status** | **Partially implemented** (dev only) |
| **Fix** | Do not reuse this compose for production. Add a prod spec and fail CI if default passwords appear outside `*.example`. |
| **Depends on** | `infrastructure/docker/.env.example` |
| **Verify** | Production Postgres rejects password `ecom`. HTTPS terminates at the edge. Worker logs show a successful DB connection. |

### PP-020 — Refresh tokens rotate without reuse detection

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Authentication |
| **Location** | `apps/api/src/auth/auth.service.ts` `refresh`, `logout` |
| **What is wrong** | A stolen refresh token works until it is used. Reuse of a rotated token does not revoke the rest of the family. Logout revokes by hash without checking the token belongs to the caller. |
| **Why it matters** | Theft is invisible. Logout does not guarantee only that user’s token is revoked. |
| **Current behavior** | Hash stored, rotated on refresh (good). No family id. |
| **Expected** | Reuse of a revoked refresh token revokes all sessions for that user. |
| **Status** | **Partially implemented** |
| **Fix** | Store a family id. On reuse, delete every token in the family. |
| **Depends on** | `RefreshToken` model |
| **Verify** | Refresh twice with the same token. Second call returns 401 and the newer token also fails. |

### PP-021 — Production CORS allowlist includes localhost

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Security |
| **Location** | `apps/api/src/main.ts` `configuredOrigins` |
| **What is wrong** | Even when `NODE_ENV=production`, origins include `http://localhost:3000`, `3001`, and `127.0.0.1`. Requests with no `Origin` are allowed. |
| **Why it matters** | Browser apps on an attacker’s machine are treated as the storefront. That becomes session theft if cookies are adopted (PP-011). |
| **Current behavior** | Localhost is always trusted. |
| **Expected** | Production allowlist is only `STOREFRONT_URL` and `ADMIN_URL`. |
| **Status** | **Partially implemented** |
| **Fix** | Push localhost origins only when `isDev`. |
| **Depends on** | PP-011 |
| **Verify** | With production env, a browser page on `http://localhost:3000` cannot call the API. |

### PP-022 — Gift cards can be created and cannot be spent

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Business logic |
| **Location** | `apps/api/src/marketing/marketing.service.ts` `adminCreateGiftCard` (comment at lines 143–147); admin `marketing/page.tsx` |
| **What is wrong** | Admin can issue a card with a balance. There is no checkout redemption, ledger, or balance deduction. |
| **Why it matters** | Staff will issue cards customers cannot use. Support load and broken promises. |
| **Current behavior** | Create and list work. Checkout ignores the code. |
| **Expected** | Either hide issuance until redemption exists, or apply the code in checkout inside a transaction. |
| **Status** | **Placeholder** |
| **Fix** | Remove the create action from the admin UI until the spend path exists. |
| **Depends on** | `GiftCard` model (no FK to orders) |
| **Verify** | Marketing page does not offer “create gift card”, or checkout reduces `balance` exactly once. |

### PP-023 — AI search and AI recommendations — out of scope

| | |
|---|---|
| **Severity** | Info |
| **Category** | Search / Out of scope |
| **Location** | `packages/config/src/env.ts` `SEMANTIC_SEARCH_PROVIDER` enum `["none"]`; `recommendations.service.ts` |
| **What is wrong** | Nothing to build. Semantic search and AI recommendations are stubs. Keyword search and rule-based recommendation slots stay. |
| **Why it matters** | **Decision:** no AI functionality in this release. Turning `recommendations.ai` or `search.semantic` on would advertise a provider that does not exist. |
| **Current behavior** | Keyword search can use Meilisearch. Semantic provider is `none`. Recommendations are rules, not a model. |
| **Expected** | Flags stay off. No new AI provider, prompts, or UI. Revisit in a later release. |
| **Status** | **Out of scope** (was Placeholder). Not a launch gap. |
| **Fix** | Leave the flags off. Remove or hide admin copy that implies AI is available. |
| **Depends on** | Meilisearch for ordinary keyword search only |
| **Verify** | Storefront search returns catalog hits. Admin does not offer an AI toggle that can be enabled. |

### PP-024 — Public shipment tracking by number

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Privacy |
| **Location** | Orders controller `track` → `trackByShipmentNumber` |
| **What is wrong** | `@Public()` returns order number and tracking events for anyone who knows the shipment number. |
| **Why it matters** | Acceptable for carrier-style tracking only if numbers are unguessable. Sequential numbers leak order progress. |
| **Current behavior** | `GET /tracking/:shipmentNumber` needs no auth. |
| **Expected** | High-entropy shipment numbers, or require email/order proof. |
| **Status** | **Fully implemented** as public tracking |
| **Fix** | Confirm the number generator’s entropy. Add a second factor if it is short. |
| **Depends on** | Storefront `/track` |
| **Verify** | Guess neighboring shipment numbers. They must not resolve. |

### PP-025 — Warehouse delete cascades the inventory ledger

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Database |
| **Location** | `apps/api/prisma/schema.prisma` `Warehouse` relations to `StockItem`, `StockMovement`, `StockReservation` (`onDelete: Cascade`) |
| **What is wrong** | Deleting a warehouse deletes stock rows and movement history. `PriceHistory` also cascades with `ProductPrice`. |
| **Why it matters** | One admin delete destroys the audit trail you need for stock disputes. |
| **Current behavior** | Database cascade, not a soft-deactivate. |
| **Expected** | `onDelete: Restrict` and a `isActive` flag. |
| **Status** | **Fully implemented** (unsafe default) |
| **Fix** | Migration to Restrict. Block delete in the service if stock remains. |
| **Depends on** | Inventory admin pages |
| **Verify** | Delete a warehouse that has movements. Expect a 409 and rows still present. |

### PP-026 — Hot foreign keys are unindexed

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Database / Performance |
| **Location** | `schema.prisma`: `OAuthAccount.userId`, `VariantOption.attributeValueId`, `ProductCategory.categoryId`, `ProductCollection.collectionId`, `ProductTag.tagId`, `Coupon` (`isActive`, `expiresAt`), `PurchaseOrder.warehouseId`, `PriceHistory.productPriceId` |
| **What is wrong** | Filters and joins on these columns will scan as data grows. |
| **Why it matters** | PLP, coupon apply, and price history slow down before you notice in dev. |
| **Current behavior** | Correct results, weak plans. |
| **Expected** | B-tree indexes matching those filters. |
| **Status** | **Partially implemented** |
| **Fix** | Additive migration with the indexes above. |
| **Depends on** | Discovery and promotions queries |
| **Verify** | `EXPLAIN ANALYZE` on category product listing and active-coupon lookup shows index scans. |

### PP-027 — Homepage canonical is inherited by pages that do not set one

| | |
|---|---|
| **Severity** | Medium |
| **Category** | SEO |
| **Location** | `apps/storefront/src/app/layout.tsx` `metadata.alternates.canonical: "/"`; `apps/storefront/src/app/blog/page.tsx`; `apps/storefront/src/app/sitemap.ts` |
| **What is wrong** | Root layout sets the canonical to `/`. Child routes that omit `alternates` can advertise the homepage as their canonical. Sitemap omits `/campaign/*` and most CMS pages (static list includes `/pages/faq` only). `/search` is canonicalized and is **not** `noindex`. |
| **Why it matters** | Blog index and search URLs can be consolidated onto the homepage or indexed as thin duplicates. Campaigns never enter the sitemap. |
| **Current behavior** | PDP, many PLPs, and CMS slug pages set their own canonical. Blog index and sitemap are incomplete. |
| **Expected** | No root canonical. Every indexable route sets its own. Sitemap includes campaigns and published pages. Search is `noindex`. |
| **Status** | **Partially implemented** |
| **Fix** | Remove root `canonical`. Extend `sitemap.ts`. Add `robots: { index: false }` on `/search`. |
| **Depends on** | `robots.ts` (already disallows account, checkout, cart, preview) |
| **Verify** | View source on `/blog` and `/search`. Canonical and robots match the URL policy. Sitemap lists a live campaign. |

### PP-028 — Storefront has no CSP; admin has no security headers

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Security / Frontend |
| **Location** | `apps/storefront/next.config.mjs` `headers()`; `apps/admin/next.config.mjs` (rewrites only) |
| **What is wrong** | Storefront sends nosniff, referrer, frame, and permissions policies, not Content-Security-Policy. Admin sends none of these and has no HTTPS middleware (storefront middleware does HTTPS + HSTS). |
| **Why it matters** | XSS (PP-013) has no second line of defense. Admin on a public host can be framed or sniffed. |
| **Current behavior** | Storefront headers exist. Admin response has no `X-Frame-Options`. |
| **Expected** | CSP compatible with Razorpay and your asset hosts. Admin mirrors storefront headers. |
| **Status** | **Partially implemented** |
| **Fix** | Add CSP and copy the header block into admin `next.config.mjs`. |
| **Depends on** | PP-001 (Razorpay script host must be allowed) |
| **Verify** | Response headers on both origins include frame protection and a CSP that still allows checkout. |

### PP-029 — API failures on the product page become 404s

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Error handling / SEO |
| **Location** | `apps/storefront/src/app/products/[slug]/page.tsx` (and the same pattern in blog and CMS fetchers) |
| **What is wrong** | Network errors and non-404 API responses are logged with `console.error` and then `notFound()`. |
| **Why it matters** | An API outage looks like a missing product, gets cached as 404, and hides the incident from the shopper. |
| **Current behavior** | User sees the not-found page. Server logs the real error. |
| **Expected** | 404 only when the API says not found. 5xx/network throws into `error.tsx`. |
| **Status** | **Partially implemented** |
| **Fix** | Branch on status code. |
| **Depends on** | `apps/storefront/src/app/error.tsx` |
| **Verify** | Stop the API and open a known PDP. Expect the error boundary, not “product not found”. |

### PP-030 — Product listing HTML is fetched on the client

| | |
|---|---|
| **Severity** | Medium |
| **Category** | SEO / Performance |
| **Location** | `apps/storefront` PLP routes (`men`, `women`, `t-shirts`, `categories`, `collections`, `campaign`, `search`) via `plp-view.tsx` |
| **What is wrong** | Routes are thin server shells. The product grid loads in the browser from the API. |
| **Why it matters** | First paint has no products. Crawlers that do not run client JS index an empty listing. Extra round trip on every PLP. |
| **Current behavior** | Metadata may be server-rendered; products are not. |
| **Expected** | First page of products rendered on the server; client takes over for filters. |
| **Status** | **Partially implemented** |
| **Fix** | Fetch the first page in the server component and pass it as initial data. |
| **Depends on** | Discovery API |
| **Verify** | `curl` a category URL. Response body contains product names. |

### PP-031 — Account, search, and price filters lack accessible names

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Accessibility |
| **Location** | `apps/storefront/src/app/account/page.tsx` login inputs; `search/page.tsx` search box; `plp-view.tsx` min/max price |
| **What is wrong** | Inputs rely on placeholders. No `<label>` or `aria-label`. PDP add-to-cart failure uses `alert()`. |
| **Why it matters** | Screen readers announce unlabeled fields. `alert()` is easy to miss and inconsistent with the rest of the UI. |
| **Current behavior** | Placeholder-only fields. |
| **Expected** | Visible labels. Inline error region with `role="alert"`. |
| **Status** | **Partially implemented** (icon buttons elsewhere use `aria-label`) |
| **Fix** | Add labels. Replace `alert()` with the existing error pattern. |
| **Depends on** | None |
| **Verify** | Accessibility tree shows a name for email, OTP, search, and both price fields. |

### PP-032 — Admin has no error boundary

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Error handling |
| **Location** | `apps/admin/src/app` (root `loading.tsx` and `not-found.tsx` only) |
| **What is wrong** | There is no `error.tsx` or `global-error.tsx`. Page-level `isError` covers React Query failures, not render crashes. |
| **Why it matters** | A broken component white-screens the admin with no recovery. |
| **Current behavior** | Query errors show a message. Render errors do not. |
| **Expected** | Route error boundary with a retry action. |
| **Status** | **Partially implemented** |
| **Fix** | Add `error.tsx`. |
| **Depends on** | None |
| **Verify** | Throw in a page render. Admin shows the boundary, not a blank document. |

### PP-033 — Notifications: marketing unsubscribe is not injected; extra channels are enums only

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Notifications |
| **Location** | `apps/api/src/notifications/notifications.service.ts` (throws if channel is not implemented, line 122); worker email/SMS adapters; `UNSUBSCRIBE_URL` |
| **What is wrong** | Preferences and `unsubscribedAt` exist. Enqueue does not fill `UNSUBSCRIBE_URL` into marketing templates. WhatsApp, push, and in-app are schema values without adapters. SMS is mock (PP-004). Email uses Nodemailer with `secure: false` and localhost defaults. |
| **Why it matters** | Marketing mail can ship without a working unsubscribe link. Unsupported channels fail at send time. Production SMTP to port 1025 goes nowhere. |
| **Current behavior** | Email can send to Mailpit locally. SMS is logged. Other channels throw `Channel X is not implemented`. |
| **Expected** | Production SMTP with TLS. Unsubscribe URL always set for marketing. Unsupported channels rejected at template save. |
| **Status** | **Partially implemented** |
| **Fix** | Inject the env URL in the processor. Validate channel against implemented adapters. |
| **Depends on** | `docs/notifications/channel-adapters.md` |
| **Verify** | Send a campaign template. Body contains a real unsubscribe URL. WhatsApp template cannot be activated. |

### PP-034 — No error tracking, metrics, or backup drill

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Monitoring / Reliability |
| **Location** | Repo-wide (no Sentry, OpenTelemetry, or Prometheus client). `docs/launch/checklist.md` backup item unchecked. `docs/decisions/0017-health-first-observability.md`. |
| **What is wrong** | Logging is pino (good) but unexpected exceptions in `AllExceptionsFilter` are not clearly tied to a request id in every path. No APM, no uptime alert, no tested restore. Prisma migrations are forward-only (`ALTER TYPE ... ADD VALUE` is not reversible). `DATABASE_URL` example has no pool limits. |
| **Why it matters** | Payment and OTP failures will be discovered by customers. A bad migration has no practiced rollback except restoring a backup you have not tested. |
| **Current behavior** | `/health/live` and `/health/ready` exist (Postgres + Redis). Docker app services do not call them. |
| **Expected** | Error tracking on API, worker, and both Next apps. Metrics for payment failures and queue depth. One restore drill recorded. |
| **Status** | **Placeholder** (health checks are real) |
| **Fix** | Add an error reporter. Point probes at `/health/ready`. Write the backup runbook result into the launch checklist. |
| **Depends on** | `apps/api/src/health/health.controller.ts` |
| **Verify** | Throw a 500. It appears in the error tracker within a minute. Restore a backup to a scratch database and boot the API. |

### PP-035 — Tests miss the money path

| | |
|---|---|
| **Severity** | Medium |
| **Category** | Testing |
| **Location** | `apps/api` specs (about 35 unit files, 1 e2e). No service specs for checkout, payments, cart, catalog, or discovery. Playwright (`playwright/tests`, about 20 files) covers shell, CMS, blog, coupons, SEO, admin dashboards — not pay → order. CI `e2e` job starts storefront and admin **without** the API or Postgres. |
| **What is wrong** | The production blocker (mock capture) is exactly the flow with no automated test. Browser CI can pass while the API is down if tests only assert static chrome. |
| **Why it matters** | PP-001 and PP-003 can regress silently. |
| **Current behavior** | CI `build` job does compile the monorepo. `security-scan` fails only on critical advisories and documents that high/moderate issues are deferred (`docs/security/sprint-00-security-review.md`). |
| **Expected** | API integration test: signature mismatch, order-id mismatch, unsigned webhook. Playwright checkout against Razorpay test or a contract double that is **not** the production code path. |
| **Status** | **Partially implemented** |
| **Fix** | Add payments service tests first. Start the API in the e2e job before claiming journey coverage. |
| **Depends on** | `.github/workflows/ci.yml` |
| **Verify** | CI fails if `confirmRazorpayClient` accepts a mismatched order id. |

### PP-036 — Coupon field has no client schema; color filter is commented out

| | |
|---|---|
| **Severity** | Low |
| **Category** | Forms / UX |
| **Location** | `apps/storefront/src/app/cart/page.tsx`; `plp-view.tsx` color filter comment |
| **What is wrong** | Coupon apply is a real API with no client-side length/format check (server still validates). Color filter is commented out until swatches exist. Wishlist delete does not check the response. Account notification toggles for transactional mail are disabled on purpose. |
| **Why it matters** | Minor UX. Not a fake coupon engine — the promotion service is real. |
| **Current behavior** | Invalid coupons fail from the API. Color filter is absent. |
| **Expected** | Inline validation. Ship the color filter when swatches exist, or delete the dead comment. |
| **Status** | **Partially implemented** |
| **Fix** | Check `response.ok` on wishlist delete. Trim the commented filter or implement it. |
| **Depends on** | Promotions API |
| **Verify** | Apply a 500-character coupon. UI shows the server error without a console-only failure. |

### PP-037 — OTP hash compare is not timing-safe

| | |
|---|---|
| **Severity** | Low |
| **Category** | Authentication |
| **Location** | `apps/api/src/auth/auth.service.ts` `verifyOtp` |
| **What is wrong** | Stored hash is compared with `!==`. Destination format is `@Length(3, 255)` rather than email or phone. |
| **Why it matters** | Practical exploitation is unlikely (short TTL, attempt cap, hashed value). Format holes create junk challenges and SMS cost once SMS is real. |
| **Current behavior** | Wrong codes increment attempts and lock after 5. |
| **Expected** | `timingSafeEqual` on the hashes. `IsEmail` or phone pattern by channel. |
| **Status** | **Partially implemented** |
| **Fix** | Constant-time compare and channel-specific DTO validation. |
| **Depends on** | PP-014 |
| **Verify** | `POST` OTP request with `not-an-email` on the email channel. Expect 400. |

### PP-038 — Account routes are protected only in the client

| | |
|---|---|
| **Severity** | Low |
| **Category** | Authentication |
| **Location** | `apps/storefront/src/middleware.ts` (HTTPS and HSTS only); account pages |
| **What is wrong** | Middleware does not check a session. Account UI redirects after client auth loads. APIs that matter do require JWT. |
| **Why it matters** | Flash of account chrome, not data theft, as long as PP-005 is fixed. |
| **Current behavior** | Unauthenticated `/account` renders, then asks for OTP. |
| **Expected** | Acceptable if every account API is authenticated. Optional: edge redirect when the cookie exists (after PP-011). |
| **Status** | **Partially implemented** |
| **Fix** | Keep API enforcement. Do not rely on the client guard alone for new account endpoints. |
| **Depends on** | PP-011 |
| **Verify** | `curl` account order APIs without a bearer token. Expect 401. |

### PP-039 — TypeScript is strict; a few production `console` calls remain

| | |
|---|---|
| **Severity** | Info |
| **Category** | Code quality |
| **Location** | No `@ts-ignore`, `@ts-expect-error`, or `: any` in app TypeScript. `console.error` in storefront fetchers and `payments.service.ts` stock/coupon failure paths. `console.log` in seeds and worker startup. |
| **What is wrong** | Fetchers log and swallow (PP-029). Payment finalization logs stock-reservation and coupon-usage failures and still returns success. |
| **Why it matters** | An order can be paid while stock or coupon usage is wrong, with only a log line. |
| **Current behavior** | Order completes; reservation consume errors are `console.error`. |
| **Expected** | Those failures are transactions or compensating jobs with metrics, not a swallowed log. |
| **Status** | **Partially implemented** |
| **Fix** | Put stock consumption and coupon usage in the same transaction as capture, or enqueue a retry that alerts. |
| **Depends on** | `payments.service.ts` around the `finalizeOrder` side effects |
| **Verify** | Force reservation consume to throw. Order must not show captured without a retry record. |

### PP-040 — Dependency audit policy allows high vulnerabilities

| | |
|---|---|
| **Severity** | Info |
| **Category** | Dependencies |
| **Location** | `.github/workflows/ci.yml` `security-scan`; comment points at `docs/security/sprint-00-security-review.md` |
| **What is wrong** | CI fails only on **critical** advisories. High and moderate findings in Nest/Next transitive deps are accepted. |
| **Why it matters** | Known high issues can ship. This review did not re-run `pnpm audit`. |
| **Current behavior** | Policy is explicit, not accidental. |
| **Expected** | Review the current audit output before launch and bump or mitigate highs that touch auth, HTTP parsing, or Next. |
| **Status** | **Partially implemented** |
| **Fix** | Run `pnpm audit` on the release commit and attach the result to the launch checklist. |
| **Depends on** | Lockfile |
| **Verify** | Audit report has zero critical and a written decision for each high. |

---

## Journey trace (code, not a live click-through)

| Journey | Result |
|---|---|
| Browse home / PLP / PDP | **Real.** CMS or catalog API, Prisma products. PLP product HTML is client-fetched (PP-030). API down looks like 404 on PDP (PP-029). |
| Search and filters | **Real** keyword search. AI/semantic search is **out of scope** (PP-023). Price filters lack labels (PP-031). |
| Cart and coupons | **Real** cart and promotions APIs. UI prints seed codes (PP-018). |
| Checkout pay | **Mocked** (PP-001, PP-002). |
| Order confirmation | **Real data, weak auth** (PP-005). |
| Account OTP login | **Partial.** Email and phone challenges exist. Phone delivery is mock SMS (PP-004). Google is partial; Facebook and admin on/off switches are missing (PP-008). Demo copy still shows (PP-018). |
| Wishlist, returns, invoices, cancel | **Real** customer order APIs with ownership checks. |
| Track shipment | **Real and public** (PP-024). |
| Admin catalog, orders, inventory, CMS, blog, pricing, coupons, notifications, analytics, reports | **Real APIs** behind permissions. Reports file delivery is not production-safe (PP-016). Gift cards stop at create (PP-022). Customer can open the shell (PP-009). |
| Product images / videos | **Not stored.** URL string only; `type` cannot be set to `video` (PP-017). **Target:** upload both to object storage. |
| Refunds | Provider method exists in `razorpay.provider.ts`. Not exercised by the storefront mock path. Treat as **partial** until a live webhook test records a refund. |

---

## A. Production blockers

Work **configuration and dummy data first** (decision 4), then the payment path.

1. **Config / dummy first:** PP-018 demo OTP copy and seed coupons; PP-004 stop logging OTPs and replace mock SMS; PP-002 Razorpay must not default to mock; PP-012 preview token must not default to `dev-preview-token`; PP-008 admin switches for email OTP, phone OTP, Google, and Facebook (methods off until their secrets exist).
2. PP-001 Replace mock capture with Razorpay Checkout.
3. PP-003 Bind the Razorpay order id and amount before capture.
4. PP-007 Preserve the webhook raw body.
5. PP-005 and PP-006 Fail closed on order and guest checkout reads.
6. PP-017 Store product images and videos in object storage (after the auth/payment config above is real).
7. PP-019 Do not deploy the dev compose file; production secrets, TLS, worker env, Redis auth.

## B. Broken functionality

- Paid checkout does not take payment (PP-001).
- Live webhooks will fail signature checks (PP-007).
- Phone OTP will not arrive; SMS is mock (PP-004). Facebook login does not exist (PP-008).
- Report export has no real download (PP-016).
- PDP and CMS outages render as 404 (PP-029).
- Stock reservation or coupon usage can fail after payment is marked captured (PP-039).

## C. Missing functionality

- Product image and video upload into object storage (PP-017). Schema has `MediaType.video`; the API never sets it.
- Facebook login and admin toggles for email OTP, phone OTP, Google, and Facebook (PP-008).
- Gift-card redemption (PP-022).
- Push, WhatsApp, in-app notification channels (PP-033).
- AI search and AI recommendations (PP-023) — **out of scope, do not build.**
- Admin error boundary (PP-032).
- CSP (PP-028).
- Error tracking, metrics, tested backups (PP-034).

## D. Mocked / demo functionality that must become real

| Item | Must ship before launch? |
|---|---|
| `mockCapturePayment` / `POST .../mock-capture` | **Yes.** Remove from production. |
| `RAZORPAY_MODE=mock` and hardcoded mock secrets | **Yes.** |
| SMS adapter `mock` | **Yes.** Phone OTP is in scope. Replace the mock; admin can turn the method off until the provider is set. |
| OTP log line and demo OTP `123456` | **Yes** for the log. Bypass is already dev-only. |
| Login/cart demo copy | **Yes.** |
| CMS preview token `dev-preview-token` | **Yes.** |
| Gift-card create without spend | Hide or finish. |
| `SEMANTIC_SEARCH_PROVIDER=none` and AI recommendations | **Out of scope.** Do not implement. Keep flags off. |
| Facebook login | **Yes**, behind an admin toggle (PP-008). Not in the codebase today. |
| Product video upload | **Yes** (PP-017). Column exists; upload does not. |
| Mailpit SMTP defaults | **Yes**, replace with a real provider. |
| Seed catalog and demo users | Dev only. Never run on production. |

## E. Security issues

PP-002, PP-003, PP-004, PP-005, PP-006, PP-008, PP-009, PP-010, PP-011, PP-012, PP-013, PP-014, PP-015, PP-018, PP-020, PP-021, PP-024, PP-028, PP-037.

## F. Performance issues

- PP-026 missing indexes.
- PP-030 client-only PLP payloads.
- Global throttle skipped on the hottest public routes (PP-014) — this is abuse more than latency, but it removes backpressure.
- Dashboard and recommendation caches exist (`DASHBOARD_CACHE_TTL_SECONDS`, `RECOMMENDATION_CACHE_TTL_SECONDS`). No bundle or Core Web Vitals measurement was run in this review.

## G. UI/UX issues

- PP-018 demo hints.
- PP-031 `alert()` on PDP and placeholder-only fields.
- PP-022 gift cards that cannot be used.
- PP-032 admin crash has no recovery UI.
- COD is described as unavailable while API remnants remain — do not enable it until the policy and UI match.

## H. Accessibility issues

- PP-031 unlabeled email, OTP, search, and price inputs.
- Icon buttons reviewed in header/cart generally have `aria-label` (not re-tested with a screen reader).
- No contrast or keyboard pass was run in a browser. Do that on staging before launch.

## I. SEO issues

- PP-027 canonical inheritance, sitemap gaps, search indexing.
- PP-029 outages emit 404.
- PP-030 listings may be empty for non-JS crawlers.
- Present and in good shape: `metadataBase`, title template, Open Graph, Twitter, `opengraph-image`, JSON-LD (organization, product, breadcrumb, article), `robots.ts` disallow list, storefront HTTPS redirect.

## J. Database issues

- PP-025 cascade deletes.
- PP-026 missing indexes.
- Money types are correct (`Decimal`).
- No backup/restore proof (PP-034).
- Migrations are not reversible.

## K. API / backend issues

- PP-007 raw body.
- PP-014 throttle bypass.
- PP-015 Swagger.
- PP-016 export paths.
- PP-039 side effects after capture.
- Validation pipe, helmet, parameterized SQL, and health checks are in place.

## L. Authentication / authorization issues

- PP-004, PP-005, PP-006, PP-008, PP-009, PP-010, PP-011, PP-012, PP-018, PP-020, PP-037, PP-038.
- In-scope login is email OTP, phone OTP, Google, and Facebook, each with an admin on/off switch (PP-004, PP-008). Only email OTP and a partial Google API exist today.
- Address IDOR and customer `loadOwnedOrder` are implemented correctly. Admin API `@Permissions` is implemented correctly.

## M. Third-party integration issues

- Razorpay mock (PP-001, PP-002, PP-003, PP-007).
- SMTP Mailpit (PP-004, PP-033).
- SMS mock, and phone OTP is required when admin enables it (PP-004).
- Product files are not in MinIO; only URL strings in Postgres (PP-017). Videos are a schema enum value, not an upload.
- Meilisearch key and `MEILI_ENV=development` in compose (PP-019).
- Google OAuth incomplete; Facebook absent; neither is an admin setting (PP-008).
- No GA/Segment (first-party analytics only — fine if intentional). AI providers are out of scope (PP-023).

## N. Error / edge-case issues

- PP-029 5xx shown as 404.
- PP-032 no admin error boundary.
- PP-039 swallowed stock/coupon failures.
- Checkout expiry is enforced in `loadAuthorizedSession` (real).
- Webhook event id idempotency is real, but useless while signatures are skipped (PP-002).

## O. Testing gaps

- PP-035. Priority tests: mismatched Razorpay order id, unsigned webhook, anonymous order GET, production boot with mock mode, OTP absent from logs.

## P. Deployment / DevOps issues

- PP-019. CI does build the apps (`turbo run build`) but the Playwright job does not start the API. No production platform config is in the repo.

## Q. Code quality / technical debt

- PP-036 commented color filter and unchecked wishlist delete.
- PP-039 `console.error` on payment side effects.
- Few `TODO`/`FIXME` comments; incompleteness is behavioral (mock providers), not comment tags.
- TypeScript is clean of `any` and `@ts-ignore` (PP-039).

## R. Environment / configuration issues

- Razorpay, CMS preview token, and `DEV_DEMO_OTP` are outside `apiEnvSchema`.
- `SMS_PROVIDER` cannot be a real vendor, but phone OTP is an in-scope login method (PP-004, PP-008).
- Auth method on/off is not stored in `Setting`. That configuration is the first admin work.
- `NEXT_PUBLIC_*` files are limited to URLs and a debug flag. A test forbids secret-like public keys (keep that).
- Defaults: JWT examples are `change-me-*`, database password `ecom`, preview token `dev-preview-token`.

## S. Monitoring / observability gaps

- PP-034. Health endpoints exist and are the right probes. Nothing pages a human when payments fail.

## T. Final production checklist

- [ ] PP-001–PP-007 fixed and covered by tests.
- [ ] Dummy data and pending config first: no demo OTP copy, no seed coupons in prod, no mock Razorpay, no `dev-preview-token`, no `SMS_PROVIDER=mock` when phone login is on.
- [ ] Admin can enable or disable email OTP, phone OTP, Google, and Facebook. Storefront follows those switches.
- [ ] Phone OTP delivers a real SMS. Google and Facebook verify audience. Facebook exists.
- [ ] Swagger off. Localhost removed from CORS. CSP on. Admin staff guard on.
- [x] Tokens not in `localStorage`, or CSP + sanitizer accepted as a written risk.
- [ ] Product images and videos upload to object storage and render on the PDP. Exports do not return server filesystem paths.
- [ ] TLS, Redis password, non-default DB/Meili/MinIO secrets, worker has `DATABASE_URL`.
- [ ] `/health/ready` wired to the load balancer.
- [ ] Error tracking and a tested database restore.
- [ ] `pnpm audit` highs reviewed. `pnpm turbo run lint typecheck test build` green on the release commit.
- [ ] Staging walkthrough: phone OTP, Google, Facebook (each toggled in admin), PLP, PDP with image and video, cart, coupon, Razorpay test payment, webhook, confirmation auth check, cancel/return, admin order, inventory adjust.
- [ ] Confirm AI search and AI recommendations stay off and are not in the test plan.

---

## Counts

| Severity | Count | IDs |
|---|---:|---|
| Critical | 4 | PP-001 – PP-004 |
| High | 15 | PP-005 – PP-019 |
| Medium | 15 | PP-020 – PP-022, PP-024 – PP-035 |
| Low | 3 | PP-036 – PP-038 |
| Info | 3 | PP-023 (out of scope), PP-039, PP-040 |
| **Total** | **40** | |

| Section | Issues |
|---|---|
| A Production blockers | 7 groups (PP-001–PP-007, PP-019) |
| B Broken | 6 |
| C Missing | 7 (AI removed from the build list; Facebook and video upload added) |
| D Mocked that must become real | Phone OTP, Facebook, and product video are now required. AI is an explicit non-goal. |
| E Security | 19 findings |
| F Performance | 3 |
| G UI/UX | 4 |
| H Accessibility | 1 confirmed in code; browser pass still required |
| I SEO | 3 |
| J Database | 3 |
| K API | 5 |
| L Auth | 12 |
| M Third-party | 6 |
| N Edge cases | 4 |
| O Testing | 1 (broad gap) |
| P Deployment | 1 (broad gap) |
| Q Code quality | 3 |
| R Environment | 3 themes |
| S Monitoring | 1 |

Counts in the category table overlap on purpose: one finding can sit in security and payments.

---

## Fix order

1. **Configuration and dummy data first:** PP-018 (demo accounts, OTP `123456` copy, seed coupon hints), PP-004 (delete OTP logs; stop treating mock SMS as sent), PP-002 (Razorpay mode and secrets are real config, not silent mock), PP-012 (no default preview token), PP-008 (admin on/off for email OTP, phone OTP, Google, Facebook). Do not add AI work (PP-023).
2. **Login methods that those switches control:** real SMS when phone OTP is on; finish Google checks; add Facebook.
3. **Payments:** PP-003, PP-007, then replace PP-001. Add tests from PP-035 before merging.
4. **Access control:** PP-005, PP-006, PP-009, PP-010, PP-015.
5. **Session hardening:** PP-011, PP-013, PP-028, PP-020, PP-021.
6. **Product media:** PP-017 upload images and videos to object storage. Then PP-016 exports, PP-025, PP-026, PP-039.
7. **Go-live ops:** PP-019, PP-034, staging journey in checklist T.

Until payments (step 3) are real, do not take customer orders. Until step 1 is done, do not treat login or checkout as configured.
