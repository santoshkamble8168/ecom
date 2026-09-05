# Industry Standards Review

**Date:** 30 August 2026  
**Scope:** Full platform as of Sprints 0–16 complete, Sprint 17 (production readiness) in progress  
**Apps:** storefront (Next.js), admin (Next.js), API (NestJS), worker (NestJS/BullMQ)  
**Datastore:** PostgreSQL via Prisma (~90 models, 15 migrations)  
**Method:** Code inspection of architecture, APIs, schema, frontends, CI, security controls, and existing ADRs. Findings cite files. Scores are reviewer judgment against named industry standards, not an automated audit.

Related: [ADR log](../decisions/decision-log.md) · [Launch checklist](../launch/checklist.md) · [Sprint tracker](../../documents/sprint-planning/README.md)

---

## 1. Executive verdict

The platform **follows industry-standard architecture choices** for a mid-stage commerce product: modular monolith, typed contracts, versioned REST API, Postgres as system of record, JWT + permission RBAC, checkout idempotency, payment HMAC intent, inventory ledger, SEO plumbing, and a shared design-token kit.

It does **not yet meet production industry standards** for money-moving reliability, accessibility, Core Web Vitals, observability, or go-live operations. That gap is expected given Sprint 17 is still open — but several items are **correctness/security issues**, not just missing polish.

| Question | Answer |
| --- | --- |
| Are the stack and topology industry-standard? | **Yes.** Next.js App Router + NestJS modular monolith + Postgres/Prisma + Redis + Meilisearch is a common 2025–2026 commerce shape (see ADRs 0001–0007). |
| Are API, auth, and schema practices generally correct? | **Mostly yes**, with specific integrity and hardening gaps below. |
| Is UI/UX aligned with e-commerce conversion practice? | **Storefront: largely yes.** Admin: incomplete (no RBAC UI, desktop-only). Accessibility is below WCAG 2.2 AA. |
| Are we production-ready against our own Sprint 17 bar? | **No.** [Launch checklist](../launch/checklist.md) is fully unchecked. |

**Overall grade: B- (strong MVP architecture, not launch-ready).**

Do not treat this as a pass/fail of Sprints 0–16 feature delivery. Feature coverage is broad. This review asks whether the **implementation quality** matches the standards the repo itself cites (OWASP ASVS, WCAG 2.2, Twelve-Factor, Clean Architecture, Prisma/Postgres practice, Baymard-style commerce UX).

---

## 2. Scorecard

Scores are 1–5. **4.0** is “aligned with common industry practice for this stage.” **5.0** is “would pass a serious production/security review with minor nits.”

| Area | Score | Grade | Industry bar used |
| --- | ---: | --- | --- |
| Architecture & modularity | 4.0 | B+ | Modular monolith, ADR 0001, NestJS feature modules |
| REST API design | 4.0 | B+ | Versioning, envelopes, pagination, OpenAPI |
| AuthN / AuthZ | 4.2 | A- | JWT, refresh rotation, permission RBAC, OTP throttle |
| Request validation | 3.5 | B | Whitelist + forbid unknown; dual Zod vs class-validator |
| Database schema | 3.8 | B+ | UUID PKs, enums, indexes, snapshots, ledgers |
| Data integrity & money | 3.2 | B- | ACID, FKs, inventory locks, Decimal vs paise |
| Storefront commerce UX | 4.0 | B+ | Baymard / Flipkart-style conversion patterns |
| Admin UX | 3.0 | B- | Ops-console IA, RBAC-aware UI, mobile |
| Accessibility | 2.5 | C+ | WCAG 2.2 AA |
| Frontend performance | 2.5 | C+ | Next.js Image, RSC, Core Web Vitals |
| SEO | 4.5 | A- | Metadata, sitemap, robots, JSON-LD |
| Application security | 3.2 | B- | OWASP API Top 10 / ASVS L1–L2 |
| Testing | 2.8 | C+ | Test pyramid; money-path coverage |
| Observability & ops | 2.5 | C | Twelve-Factor, health, traces, runbooks |
| Production readiness | 2.0 | C | Sprint 17 / launch checklist |

---

## 3. Standards this review uses

| Standard | Why it applies |
| --- | --- |
| **Twelve-Factor App** | Config, backing services, logs, disposability for API + worker |
| **OWASP API Security Top 10** and **ASVS** | Auth, access control, misconfig, webhooks, secrets |
| **PCI-DSS (SAQ A intent)** | No card data on our hosts; Razorpay as PSP; webhook authenticity |
| **WCAG 2.2 Level AA** | Cited in project rules; required for public storefront |
| **RFC 7807 Problem Details** | Error-contract industry default (we use a custom envelope instead — acceptable if documented) |
| **REST + OpenAPI** | Versioned HTTP API, documented schemas |
| **Postgres / Prisma practice** | FKs, indexes, `TIMESTAMPTZ`, CHECK constraints, pooling, migrations |
| **NestJS modular monolith** | Feature modules, pipes, guards, filters — matches ADR 0001 |
| **Next.js App Router** | RSC, `next/image`, metadata API — matches ADR 0002 |
| **Baymard-style commerce UX** | Price clarity, sticky ATC, trust, empty/error recovery |
| **Nielsen usability heuristics** | Match system/real world (Buy Now), error prevention, consistency |
| **GDPR / DPDP-style privacy** | Erasure, retention, PII in logs and snapshots (India DPDP Act relevant) |

Project-local bars: ADRs 0001–0017, `.cursor/rules/*`, sprint Definition of Done.

---

## 4. What already matches industry practice

Keep and protect these. They are the reason the overall grade is not lower.

1. **Modular monolith over premature microservices** — [ADR 0001](../decisions/0001-modular-monolith-architecture.md). Correct for team size and unproven domain boundaries.
2. **Thin controllers, fat services, policy functions** — domain rules live in `*/policies/*` (order state machine, tax/shipping, payment signatures, coupons). Controllers (except health) do not inject Prisma.
3. **Typed monorepo contracts** — `@ecom/types`, `@ecom/validation`, `@ecom/shared` error codes and envelopes, `@ecom/config` boot-time Zod env validation.
4. **API versioning** — global prefix `api/v1`; health/SEO excluded from prefix (`apps/api/src/main.ts`).
5. **Strict ValidationPipe** — `whitelist` + `forbidNonWhitelisted` + `transform` (mass-assignment defense).
6. **JWT access + hashed rotating refresh tokens**; OTP hashed at rest; attempt limits; auth-route throttles with e2e 429 coverage.
7. **Permission-based RBAC** on admin API (`@Permissions` + `PermissionsGuard`).
8. **Checkout `Idempotency-Key`** persisted in `CheckoutIdempotency`.
9. **Payment webhook idempotency** on `(provider, eventId)`; HMAC helpers use `timingSafeEqual`.
10. **No PAN/CVV in schema** — PCI scope reduction is correct if Razorpay stays hosted.
11. **Inventory ledger + reservations** — append-only `StockMovement`, `StockItem` as cache, reservation expiry for workers ([ADR 0010](../decisions/0010-inventory-ledger-and-price-resolution.md)).
12. **Order snapshots** — line items and shipping address frozen as JSON at purchase time (commerce-correct denormalization).
13. **Helmet, CORS, request IDs, structured Pino logs with redaction, `/health` `/health/live` `/health/ready`**.
14. **Storefront conversion UX** — sticky mobile Add to Bag, compare-at + % off, size-gate modal, trust badges, cart “save for later” recovery, pincode ETA.
15. **SEO** — `generateMetadata`, canonicals, robots, sitemap, JSON-LD, noindex on cart/checkout/account ([ADR 0015](../decisions/0015-seo-and-cache.md)).
16. **Design tokens** with documented contrast targets (`packages/ui/src/tokens.ts`).
17. **Forward-only Prisma migrations**, snake_case mapping, UUID PKs, rich enums.
18. **Written ADRs and sprint security reviews** — unusual (and good) for a product at this age.

---

## 5. UI / UX review

### 5.1 Architecture (Next.js)

Both apps use **Next.js 15 App Router + React 19**, which matches [ADR 0002](../decisions/0002-nextjs-app-router-for-frontends.md) and current industry default for SEO-heavy commerce.

| Practice | Status | Evidence |
| --- | --- | --- |
| Server Components for catalog/SEO shells | Partial | Homepage, PDP shell, CMS, blog are RSC with `revalidate` |
| Client islands for interactive commerce | Expected | PLP, cart, checkout, account, header are `"use client"` |
| Shared design system | Partial | Tokens + Tailwind preset + Storybook; missing Input/Select/Modal/Toast primitives |
| Data fetching | Split | Admin uses TanStack Query; **storefront installs QueryClient but never uses `useQuery`** |
| Forms | Split | Admin: React Hook Form + Zod. Storefront: mostly hand-rolled state |
| `next/image` | **Missing** | Config exists (`remotePatterns`, AVIF/WebP). **Zero `next/image` imports** in app source |
| `next/font` | **Missing** | Tokens name Inter/Sora; layouts use `system-ui` |

**Verdict:** Topology is standard. Implementation underuses the Next.js and TanStack capabilities already wired in.

### 5.2 Storefront commerce UX (Baymard-style)

The storefront already implements patterns that many MVPs skip:

- **PDP:** `PriceDisplay` with compare-at and discount, size picker before add, mobile sticky ATC, delivery pincode, free-shipping/COD copy, genuine/secure/returns badges, reviews, related products (`apps/storefront/src/components/pdp/pdp-view.tsx`).
- **PLP:** URL-synced filters/sort/pagination, mobile filter sheet, skeletons, empty-state recovery (`apps/storefront/src/components/discovery/plp-view.tsx`).
- **Cart:** Coupons, save-for-later, clear-bag confirmation that offers save-for-later (`apps/storefront/src/app/cart/page.tsx`).
- **Checkout:** Stepped address → shipping → payment, sticky summary, guest + saved addresses, terms gate, address draft in `sessionStorage` across login (`apps/storefront/src/app/checkout/page.tsx`).

Gaps versus conversion research and Nielsen heuristics:

| Severity | Issue | Why it matters |
| --- | --- | --- |
| Major | **Buy Now** calls the same handler as Add to Bag | Violates “match between system and real world.” Users expect express checkout. |
| Major | Cart/checkout/account loading is text, not skeletons | Perceived performance and trust. |
| Minor | Quantity selector commented out on PDP | Common PDP control; restock/oversell UX suffers. |
| Minor | No sticky mobile checkout CTA on cart | Desktop summary can scroll away. |
| Minor | Homepage hero is inset, not full-bleed | Weaker campaign impact vs reference screenshots. |
| Minor | PLP error has no retry button | Recovery heuristic. |

### 5.3 Admin UX

Information architecture in `apps/admin/src/components/layout/admin-sidebar.tsx` is clear (Overview, Catalog, Sales, Inventory, Pricing, Administration, Analytics, Content, Marketing). List pages follow a repeatable search + filter + table pattern with React Query.

**Industry gaps:**

1. **RBAC is not reflected in the UI.** `PERMISSIONS` in `packages/types` is used by the API and **never imported by admin**. Any valid JWT sees the full sidebar and all actions. The API will 403, but the console will look broken and a low-privilege user can probe every screen. Industry ops consoles hide or disable unauthorized nav.
2. **Sidebar is `hidden md:block` with no mobile drawer** — admin is desktop-only.
3. Destructive actions often use `window.confirm` instead of an in-app dialog (inaccessible, easy to miss).
4. Products header still exposes a “Login” affordance inside an already-gated shell.

### 5.4 Accessibility (WCAG 2.2)

**Partial AA intent, not conformance.**

Present: skip link + `#main-content` on storefront, `lang="en"`, many `aria-label`s on icon buttons, `aria-busy` on UI kit Button, `role="status"` on route loaders, Storybook a11y addon, contrast notes on tokens.

Missing or failing common AA criteria:

| Criterion | Finding |
| --- | --- |
| 2.1.1 Keyboard / 2.4.3 Focus | Size picker, cart clear modal, mobile filters: **no focus trap, no restore, background not `inert`**. Escape handling only confirmed on audit drawer. |
| 1.1.1 Non-text content | PDP gallery thumbs use `alt=""`; product cards use raw `<img>`. |
| 3.3.2 Labels | Pincode and several admin search fields are placeholder-only. |
| 1.3.1 Info and relationships | PDP accordions lack `aria-expanded` / `aria-controls`. |
| Admin skip link | Absent. |

Sprint 15 documented residual a11y work in `docs/security/sprint-15-accessibility-conformance.md`. That residual is still the live gap.

### 5.5 Performance and Core Web Vitals

Highest-impact miss: **no `next/image`**. Configured and unused. Raw `<img>` on ProductCard, homepage, PDP, cart, blog means missed automatic `srcset`, modern formats, and CLS-friendly sizing.

Other CWV risks: large client islands for PLP (grid fetched on client instead of RSC + Suspense), unused React Query on storefront, no `loading="lazy"` / `fetchpriority` on LCP candidates, fonts not loaded via `next/font` (FOUT/CLS).

Performance budgets in `docs/performance/budget.md` are **not CI gates**.

### 5.6 Design system vs ADR 0008

[ADR 0008](../decisions/0008-tailwind-and-shadcn-style-design-system.md) describes a shadcn/Radix-style primitive kit. Reality is a **product component kit** (ProductCard, PriceDisplay, KPI cards, tables) with **no shared Dialog, Input, Select, Toast, or Pagination**. Apps reinvent those with one-off Tailwind. That is the root cause of inaccessible modals and duplicated status badges.

---

## 6. Backend / API review

### 6.1 Architecture (Clean Architecture vs what shipped)

ADR 0001 describes four layers (API, application, domain, infrastructure). The code is a **NestJS modular monolith**:

```
Controller → Service → (policy helpers) → Prisma / Redis / Meilisearch / Razorpay
```

There are **no ports/adapters, no repository layer, no framework-agnostic domain entities**. Prisma is global; any module can touch any table. That is **normal and acceptable** for this stage (YAGNI vs full hexagonal). It is **not** Clean Architecture as the sprint tracker claims.

Layering smells (not blockers):

- Fat services mix HTTP, queues, and business rules (`auth.service.ts`, `payments.service.ts`).
- Inline DTO classes inside `checkout.controller.ts` and `payments.controller.ts`.
- `PermissionsGuard` hits Prisma on every permission-gated request with no cache (`apps/api/src/common/guards/permissions.guard.ts`).
- `AppModule` reads `process.env` for BullMQ instead of injected `APP_ENV`.

**Industry alignment:** NestJS feature-module modular monolith = **aligned**. Claiming DDD/Clean Architecture as fully implemented = **overstated**.

### 6.2 REST, envelopes, OpenAPI

| Topic | Practice | Alignment |
| --- | --- | --- |
| Versioning | `api/v1` | Aligned |
| Success envelope | `{ success, data, meta?, requestId, timestamp }` | Consistent; fine if clients share `@ecom/types` |
| Error envelope | `{ success: false, error: { code, message, details? } }` | **Not RFC 7807**. Acceptable if documented as the contract |
| Pagination | Offset/page + `buildPaginationMeta` | Fine for admin; cursor pagination missing for huge lists |
| Idempotency | Checkout place-order only | Industry often extends to payment confirm |
| OpenAPI | Swagger at `{prefix}/docs` **always on** | Docs: good. **Prod exposure: misconfiguration** |
| RPC-ish routes | `POST .../place-order` | Common in commerce; not pure REST |

### 6.3 AuthN / AuthZ

**Aligned:** Bearer JWT (not cookies, so CSRF is lower risk), refresh rotation, hashed OTP, max attempts, Google `idToken` verify, `@Public()` optional-auth for cart/checkout, permission keys in `@ecom/types`.

**Gaps:**

1. **Default-allow guards.** If a handler has no `@Permissions` / `@Roles`, both guards return `true` (`permissions.guard.ts` lines 23–24). New admin endpoints are insecure until someone remembers the decorator. Industry pattern: deny-by-default for `/admin/*`.
2. **OTP plaintext logged** in `auth.service.ts` (“dev-only” comment, **no `NODE_ENV` guard**). If logs ship to a vendor in staging/prod, this is a secret leak (OWASP A02/A09).
3. **Refresh token in JSON body** — XSS on the SPA can steal it. httpOnly cookie refresh is the stricter pattern; Bearer is a documented tradeoff, not a bug, but XSS hardening matters more.
4. **Google audience check skipped** when `GOOGLE_CLIENT_ID` is empty.
5. **OTP hash is unsalted SHA-256.** Sprint 0 already flagged HMAC/upgrade; still open.
6. JWT secrets minimum length is **16 characters** (`packages/config/src/env.ts`) — too short for production (use 32+ bytes of CSPRNG).

### 6.4 Validation dual-track

Runtime API validation is **class-validator**. Shared package `@ecom/validation` is **Zod** and is barely used as Nest pipes (checkout address / pincode helpers). Parallel schemas (e.g. OTP request) can drift.

Industry preference: **one schema language at the HTTP boundary**. Either generate class-validator from Zod, or use a Zod ValidationPipe.

Env validation via Zod at boot is Twelve-Factor-correct — but **Razorpay, webhook secret, and payment TTLs are in `.env.example` and not in `apiEnvSchema`**. Production can boot in mock payment mode with missing secrets.

### 6.5 Error handling and observability

`AllExceptionsFilter` maps domain errors to stable codes and does not leak internals on 500s — good. It **does not log** unhandled exceptions. Combined with no OpenTelemetry, 5xx incidents will be hard to debug.

Present: request ID middleware, envelope `requestId`, Pino, health probes.  
Absent: traces, RED/USE metrics, alerting, CLS/`AsyncLocalStorage` so every log line carries `requestId`. [ADR 0017](../decisions/0017-health-first-observability.md) explicitly defers Prometheus/Grafana — that is an accepted risk, not an accident.

### 6.6 Module inventory (API)

Auth, Users, Admin, Cart, Checkout, Payments, Orders, Catalog, Discovery, Product, Storefront, Inventory, Pricing, Promotions, Cms, Blog, Marketing, Dashboard, Customers, Platform, Reports, Notifications, Analytics, Seo, Recommendations, plus Prisma, Redis, Health, Audit, config, logger.

This is a complete commerce modular monolith surface. Ownership is by Nest module, not by bounded-context package — extraction later will be a cut, not a lift.

### 6.7 Worker / queues

BullMQ notifications with retries and DLQ retention is standard. Gaps: **no jobId dedupe** (double enqueue can double-send), send path is not idempotent after SMTP success-before-ack, **webhooks process inline in the API** (timeout/reliability; already accepted in the Sprint 8/9 security review), worker Compose env is incomplete (`REDIS_HOST` only), in-process crons do not scale horizontally without a singleton.

---

## 7. Database review

### 7.1 Schema quality

~90 models, UUID PKs, `@@map` snake_case, explicit `onDelete` on most relations, heavy use of enums for lifecycles, JSON used for snapshots/CMS/audit (intentional), abundant indexes on orders/payments/analytics/reservations.

**Aligned with Prisma/Postgres commerce schemas.**

Issues:

| Topic | Finding | Standard |
| --- | --- | --- |
| Money | `Decimal(10, 2)` everywhere; paise only at Razorpay boundary; `Number(decimal)` at payment edges | Payments industry prefers **integer minor units** in the ledger |
| Timestamps | Prisma `TIMESTAMP(3)`, not `TIMESTAMPTZ` | Postgres best practice is timestamptz + UTC policy |
| CHECK constraints | **None** in migrations | ADR 0004 cited CHECKs as a reason to pick Postgres |
| Soft delete | None; status enums only | Fine for catalog; weak for GDPR erasure vs legal retention |
| String SKU refs | Cart, stock, reservations, shipments store `variantSku` **without FK** to `product_variants.sku` | Referential integrity |
| `RefundRequest.orderId` | Indexed string, **no Prisma relation/FK** | Orphan refunds possible |
| `CouponUsage.userId` / `orderId` | Indexed, no FKs | Same |
| Redundant indexes | `Category.slug` / `Product.slug` are `@unique` **and** `@@index([slug])` | Harmless waste |
| Analytics growth | `analytics_events` unpartitioned | Will need partitioning/TTL (retention job exists in worker) |

### 7.2 Commerce model completeness

**Present:** identity, catalog, variants, inventory/warehouses/POs, cart, checkout, orders, Razorpay+COD, refunds, settlements, shipments, returns/exchanges, pricing, CMS, notifications, analytics, audit, reviews, wishlist, recommendation slots.

**Thin or missing for India production ecom:**

- **GST:** `TaxRule` is a single rate (seed: 5% apparel). No GSTIN, HSN/SAC, place of supply, CGST/SGST/IGST lines on invoice/order.
- **No `OrderLineItem` table** — lines live only in JSON (harder reporting, FK, and tax lines).
- **Single-tenant, single currency string** (`"INR"`), no FX.
- **No GDPR/DPDP erasure workflow** for address JSON, delivery destinations, audit `before`/`after`.
- Loyalty / gift card / wallet are stubs (flags/schema hooks, not ledgers).
- No product weight/dimensions for real shipping rate engines.

### 7.3 Integrity and concurrency (highest DB risk)

Inventory reservation **model** is industry-grade. **Implementation** has races:

1. Reservations use `$transaction` but **not `SELECT … FOR UPDATE`**. Under Read Committed, concurrent checkouts can oversell.
2. `finalizeOrder` in `payments.service.ts` creates the order, then **best-effort** consumes reservations and records coupon usage (explicitly non-blocking). A captured payment can succeed while the stock ledger lags. Comments document this; it is still a **ledger correctness** issue for flash sales.
3. `OrdersService.transition` updates `Order.status` then writes `OrderStatusHistory` **without `$transaction`** — crash = history desync.
4. `StockReservation.checkoutId` is used in consume-by-checkout and **has no index** (only `cartId` is indexed).

These are the main places the schema’s ACID story does not match runtime behavior.

### 7.4 Migrations and ops

15 sequential Prisma migrations, additive, not reversible (especially `ALTER TYPE ... ADD VALUE`). No documented backup/restore drill. `DATABASE_URL` example has **no `connection_limit` / PgBouncer**. `docs/database/README.md` is still a generic stub — the schema has outgrown the docs.

Seed data is appropriate for a fashion MVP (INR, Indian warehouses, demo OTP `123456` in development only). No production secrets in seed.

### 7.5 Privacy

PII columns: email, phone, addresses, OTP destination, delivery logs, newsletter, support notes, audit IP and JSON diffs, payment webhook payloads.

Hashes for passwords, refresh tokens, OTP codes: **good**. No column encryption for addresses. User delete SetNulls orders (correct for legal records) but does not anonymize `shipping_address` JSON.

PCI: no card fields. Retain/redact `payment_webhooks.payload` and `payment_attempts.raw_response`.

---

## 8. Security, testing, and operations

### 8.1 OWASP API Top 10 (selected)

| Item | Assessment |
| --- | --- |
| Broken object-level auth | Ownership checks in services (404 on miss) — needs adversarial tests |
| Broken auth | Solid OTP/JWT; OTP log + short JWT min + Google aud optional |
| Mass assignment | ValidationPipe whitelist helps |
| Unrestricted resource use | Global throttle **undermined** by `@SkipThrottle()` on checkout, payments, cart, orders, catalog, discovery, CMS, analytics, recommendations |
| Security misconfig | Swagger always on; prod CORS still includes localhost; Helmet without tailored CSP; nginx HTTP only |
| Integrity | Webhook HMAC intended; **`rawBody: true` not set** on `NestFactory.create` — fallback `JSON.stringify(req.body)` can break or weaken signature verify (`payments.controller.ts`) |
| Logging | Request IDs yes; 5xx not logged in filter; OTP logged in clear |

### 8.2 PCI posture

Viable **SAQ A** only if: cards never touch our servers, webhook signatures verify on **raw bytes**, production **cannot** fall back to `RAZORPAY_MODE=mock` when keys are missing (`payment.policy.ts` defaults mode to `"mock"`), and TLS terminates at the edge.

### 8.3 Twelve-Factor

Config is env + Zod for a **subset** of variables. Worker does not share the same schema. Logs are stdout JSON. Disposability has HTTP probes but Dockerfiles lack `HEALTHCHECK` and non-root user. Dev/prod parity is weak (Compose defaults, no TLS, no secrets manager).

### 8.4 Test pyramid (claimed vs real)

Sprint DoD asks for unit + integration + e2e + a11y + performance. Folders under `tests/*` are **README stubs**.

| Layer | Reality |
| --- | --- |
| Unit | Strong on **policies**; many API `*.service.spec.ts`. **No** `checkout.service.spec.ts` or `payments.service.spec.ts`. Storefront/admin `"no tests yet"`. |
| Integration / API e2e | `apps/api/test/app.e2e-spec.ts`: health, OTP envelope, OpenAPI smoke, OTP 429. **No** place-order, webhook, refund, IDOR. |
| Playwright | ~19 UI specs; commerce journeys deferred; **CI does not start API/worker/DB**. |
| A11y | axe helpers + Storybook addon; not a WCAG gate. |
| Performance / security tests | Docs and budgets only. |

Money paths (checkout, capture, webhook, stock consume) are the **least** automated — the opposite of a risk-based pyramid.

### 8.5 CI

`.github/workflows/ci.yml`: typecheck, lint, unit tests with Postgres/Redis, API smoke e2e, Playwright without backend, build, `pnpm audit --audit-level=critical` only. No Dependabot, SAST, container scan, image publish, or staging deploy.

---

## 9. Are we following “the correct standard”?

Short answers:

**Yes, for a pre-production commerce platform:**

- Topology (modular monolith, App Router, Postgres, Redis, search, object storage)
- API shape (v1, envelopes, Swagger, pagination)
- Auth model (JWT + permissions)
- Catalog → cart → checkout → payment → order → inventory ledger design
- SEO and conversion-oriented storefront patterns
- ADR culture and sprint security write-ups

**No, if the question is “would this pass a production, PCI-aware, WCAG, and SRE review tomorrow?”**

- Webhook raw-body, mock payments default, Swagger, OTP logs, TLS
- Inventory/order transactions vs concurrent checkout
- Accessibility of dialogs and labels
- `next/image` / CWV
- Admin permission-aware UI
- Tests on payment/checkout
- Metrics, traces, backups, launch checklist

The sprint tracker’s Definition of Done (OpenAPI, Storybook, e2e, a11y, performance, security review **for every sprint**) is **stricter than what was actually enforced**. Several sprints are marked Done with deferred Storybook/E2E and template docs still in `docs/architecture`, `docs/database`, `docs/deployment`.

That is the main process finding: **standards are written; several are not operationalized.**

---

## 10. Prioritized remediation

Aligned with Sprint 17. Do these in order.

### P0 — before any real money or public traffic

1. Enable Nest `rawBody: true` (or equivalent middleware) and verify Razorpay HMAC against the exact bytes. Remove JSON stringify fallback for live mode.
2. Fail closed: if `NODE_ENV=production`, require Razorpay secrets and **forbid mock mode**. Add those vars to `apiEnvSchema`.
3. Disable or protect `/api/v1/docs` in production.
4. Stop logging OTP codes (or gate strictly on development). Raise JWT secret minimums.
5. TLS + HSTS at nginx; drop localhost from production CORS allowlist; add `limit_req`.
6. Make order finalize + stock consume **transactional** (or outbox). Add `FOR UPDATE` / conditional increments so reservations cannot oversell.
7. Add automated tests: webhook signature success/fail, idempotent webhook replay, place-order + `Idempotency-Key`, oversell race.

### P1 — before calling the product “production-grade”

8. Accessible `Dialog` primitive in `@ecom/ui` (focus trap, Escape, labelled). Use it on PDP, cart, admin.
9. `next/image` (or shared Image wrapper) on ProductCard, heroes, gallery.
10. Admin nav/actions gated by `PERMISSIONS`; deny-by-default for `/admin/*` if decorator missing.
11. Revisit class-level `@SkipThrottle` on checkout/payments; keep webhook reachable but rate-limit public writes.
12. Wire storefront cart/PLP to React Query or RSC+Suspense; fix Buy Now vs Add to Bag.
13. GST line breakdown on invoices if selling in India at scale; FK `RefundRequest.orderId`; index `stock_reservations.checkout_id`.
14. Log 5xx in `AllExceptionsFilter` with `requestId`. Backup/restore drill. Start API in Playwright CI.

### P2 — quality bar

15. One validation story (Zod pipes or generated DTOs).
16. `TIMESTAMPTZ` + documented UTC; CHECK constraints on non-negative money/qty.
17. Cursor pagination for large admin lists; partition/TTL analytics events (partially planned).
18. Admin mobile nav; `next/font`; Input/Select in the UI kit.
19. GDPR/DPDP erasure runbook; redact webhook payloads.
20. OpenTelemetry when traffic justifies it (ADR 0017 revisit).

---

## 11. Suggested Definition of Done for Sprint 17

Use this as the close-out gate (also tick [launch checklist](../launch/checklist.md)):

- [ ] P0 items 1–7 evidenced in code and tests
- [ ] Staging URL: auth, PLP, PDP, cart, checkout, **live or sandbox webhook**, order, return
- [ ] `GET /health/ready` used by the load balancer
- [ ] Secrets not from `.env.example`; mock Razorpay impossible in that environment
- [ ] Backup restored once onto a copy of production-shaped data
- [ ] Axe pass on homepage, PLP, PDP, cart, checkout, one admin list
- [ ] LCP/CLS reviewed on staging against `docs/performance/budget.md`
- [ ] On-call + payment and delivery runbooks confirmed

---

## 12. Evidence index

| Area | Primary paths |
| --- | --- |
| API bootstrap | `apps/api/src/main.ts` |
| App composition | `apps/api/src/app.module.ts` |
| Auth | `apps/api/src/auth/auth.service.ts`, `demo-accounts.ts`, `auth.controller.ts` |
| Permissions | `apps/api/src/common/guards/permissions.guard.ts`, `packages/types/src/identity.ts` |
| Payments | `apps/api/src/payments/payments.controller.ts`, `payments.service.ts`, `policies/payment.policy.ts` |
| Checkout | `apps/api/src/checkout/checkout.controller.ts` |
| Inventory | `apps/api/src/inventory/inventory.service.ts` |
| Env schema | `packages/config/src/env.ts` vs `apps/api/.env.example` |
| Prisma | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/` |
| Storefront UX | `apps/storefront/src/components/pdp/pdp-view.tsx`, `discovery/plp-view.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx` |
| Admin shell | `apps/admin/src/components/layout/admin-sidebar.tsx`, `auth/admin-auth-guard.tsx` |
| Design tokens | `packages/ui/src/tokens.ts` |
| CI | `.github/workflows/ci.yml` |
| Launch | `docs/launch/checklist.md` |

---

## 13. How to use this document

- **Product / eng lead:** treat Section 10 P0 as Sprint 17 scope, not a backlog dump.
- **Reviewers:** new PRs should not regress items already marked aligned (envelopes, idempotency keys, hashed OTP, no PAN, permission decorators on new admin routes).
- **Do not** rewrite the architecture to full Clean Architecture or microservices to “match the rules files.” The modular monolith is the correct standard for this team; update the marketing language in sprint docs instead.

Re-review after Sprint 17 closes, or after P0 is done — whichever comes first.
