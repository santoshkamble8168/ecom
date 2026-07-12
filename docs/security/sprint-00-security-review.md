# Sprint 0 Security Review

Status: Complete
Reviewed: Sprint 0 — Project Foundation (monorepo, Docker, design system,
authentication skeleton)
Scope: `apps/api`, `apps/storefront`, `apps/admin`, `apps/worker`,
`infrastructure/docker`, `infrastructure/nginx`, shared `packages/*`

## Summary

Sprint 0 ships infrastructure and an authentication skeleton, not
customer-facing commerce flows, so the attack surface is small: OTP
request/verify/refresh, health checks, and static app shells. This review
covers authentication, authorization, input validation, secrets handling,
transport/edge hardening, dependency risk, and audit logging. Three real
issues were found and fixed during the review; the rest are logged below
as accepted risks with an owning future sprint.

## Findings Fixed During This Review

| # | Finding | Severity | Fix |
| --- | --- | --- | --- |
| 1 | `POST /auth/otp/request` and `/otp/verify` are public, unauthenticated, and had **no rate limiting** beyond the 5-attempt cap on verify. An attacker could spam OTP generation to run up SMS/email costs, grow the `OtpChallenge` table, or brute-force codes at unlimited speed. | High | Added `@nestjs/throttler` as a global guard (60 req/min/IP default) with a stricter per-route override: 5 requests / 10 min for `otp/request`, 10 / 10 min for `otp/verify`. Verified with an e2e test that the 6th request in the window returns `429` wrapped in the standard error envelope (`RATE_LIMITED`). |
| 2 | Primary button (`bg-brand-600` + white text), the storefront announcement bar, and the admin sidebar section labels failed the WCAG 2.1 AA 4.5:1 color-contrast threshold (measured 2.56–3.56:1). Low-vision users could not reliably read primary CTAs or navigation. | Medium (accessibility, tracked here because it was caught by the same hardening pass) | Darkened the affected tokens/classes (`brand-600` → `brand-700`, sidebar label `neutral-400` → `neutral-500`) and re-verified with the Storybook a11y addon and a Playwright + axe-core assertion. See `packages/ui/src/components/button.tsx`, `apps/storefront/src/components/layout/site-header.tsx`, `apps/admin/src/components/layout/admin-sidebar.tsx`. |
| 3 | The `test` CI job ran `pnpm turbo run test:e2e` (API integration tests hitting real Postgres/Redis) but no dependency-vulnerability scan existed anywhere in CI, despite the Sprint 0 plan calling for a "security scan placeholder." | Medium (process gap) | Added a `security-scan` CI job running `pnpm audit --audit-level=critical` so the pipeline fails on newly introduced critical advisories, without blocking merges on the pre-existing transitive findings logged below. |

## Findings Logged As Accepted Risk (No Sprint 0 Code Change)

| # | Finding | Severity | Rationale / Plan |
| --- | --- | --- | --- |
| 4 | OTP codes are hashed with unsalted, unkeyed `SHA-256` (`createHash("sha256")`) before storage. | Low | Codes are 6 digits, expire in 10 minutes, capped at 5 verify attempts, and (as of fix #1) rate-limited per IP — a DB leak window is short and attempts are bounded either way. Recommend switching to an HMAC keyed with a server secret (`crypto.createHmac`) during Sprint 1 when the auth module is revisited for Google OAuth. |
| 5 | JWT access/refresh secrets are only validated to be `>= 16` characters (`packages/config/src/env.ts`). | Low | Sufficient for local/dev; production deployments must supply high-entropy secrets (32+ bytes) via a real secrets manager, never `.env` files. `.env`/`.env.*.local` are correctly gitignored (verified). Track enforcing a stronger minimum (e.g. 32 chars) alongside Sprint 1's production deployment guide. |
| 6 | Helmet is enabled with its default policy; no explicit `Content-Security-Policy` is configured yet. | Low | Default Helmet headers (`X-Content-Type-Options`, `X-DNS-Prefetch-Control`, etc.) already apply. A tailored CSP needs to know final storefront/admin script and asset origins (analytics, payment SDKs, image CDN), which aren't finalized until later sprints — revisit in Sprint 15 (Performance & SEO) or when the first third-party script is added. |
| 7 | Nginx edge config (`infrastructure/nginx/nginx.conf`) has no `limit_req` zones and relies on default `client_max_body_size`. | Low | Fine for current static-shell traffic. Add rate-limit zones and a larger body-size allowance once file uploads (product images, Sprint 2/11) and checkout endpoints exist and are reachable through the edge. |
| 8 | Docker Compose ships convenience default credentials (`ecom`/`ecom` Postgres, `devMasterKeyChangeMe` Meilisearch, `ecomminio`/`ecomminio123` MinIO) via `${VAR:-default}` interpolation. | Low | Local-dev only; verified `.env` files are gitignored and never committed. Any real deployment must override every `*_default` value through the deployment platform's secret store — call this out explicitly in the deployment guide (Sprint 17). |
| 9 | `RolesGuard` allows any authenticated user through when a route has no `@Roles()` metadata (i.e., "authenticated" is the default, not "deny by default per role"). | Low | Intentional for Sprint 0 — there are no role-gated routes yet. Must be revisited as admin-only endpoints land (Sprint 2+ catalog/admin CRUD) to confirm every admin route explicitly declares required roles. |
| 10 | No audit-log table or write path exists yet, though the Sprint 0 plan calls out an "audit" cross-cutting module. | Low | Scoped out of Sprint 0 to avoid speculative schema design before there are mutating admin actions to audit. Tracked for Sprint 12 (Admin Dashboard), which explicitly requires audit logs. |
| 11 | Google OAuth env vars (`GOOGLE_CLIENT_ID`/`SECRET`/`CALLBACK_URL`) exist in config validation but no OAuth flow is implemented. | Informational | Expected — Sprint 0 explicitly scopes OAuth implementation out ("without completing customer-facing auth flows"). Implementation lands in Sprint 1. |

## Dependency Vulnerability Scan (`pnpm audit`)

Ran `pnpm audit` (all workspaces) and `pnpm audit --prod`. Result: **0
critical**, 10 high, 16 moderate, 3 low — all in transitive dependencies of
frameworks/tooling, not code we author or call directly today:

- **`multer` (high×4, moderate×1)** — pulled in transitively via
  `@nestjs/platform-express`. We don't have any file-upload endpoints yet
  (Sprint 0 has none), so these DoS advisories aren't currently reachable.
  Will resolve automatically once `@nestjs/platform-express` bumps its
  `multer` range; re-check when file uploads are added (Sprint 2/11).
- **`lodash` (high×1, moderate×2)** — transitive via `@nestjs/config` and
  `@nestjs/swagger`. We don't call `lodash.template`, `_.unset`, or
  `_.omit` ourselves.
- **`js-yaml` (moderate×2), `qs` (moderate×1), `file-type` (moderate×2),
  `@nestjs/core` (moderate×1)** — transitive via `@nestjs/swagger` /
  Express body-parser; not exposed to untrusted YAML input or reachable
  through code we wrote.
- **`vite`, `esbuild`, `picomatch`, `ajv`, `tmp`, `glob`, `webpack`
  (dev-only, high/moderate/low)** — all `devDependencies` of Storybook /
  Playwright tooling, never shipped to production and not reachable
  outside a developer's local machine.
- **`playwright` (high)** — SSL-verification gap during the one-time
  browser binary download step; affects `pnpm exec playwright install`
  only, not test execution or production code.

None of these are patchable today without an upstream major-version bump
of `@nestjs/*`, `next`, `storybook`, or `playwright` (patched versions of
the leaf packages aren't yet satisfied by those frameworks' declared
ranges). Action taken: added a `security-scan` CI job
(`pnpm audit --audit-level=critical`) so any newly introduced **critical**
advisory fails the build immediately, and this table serves as the
baseline for a manual re-check each sprint. Recommend enabling GitHub
Dependabot version updates in a follow-up sprint for continuous coverage
beyond the manual per-sprint audit.

## Strengths Confirmed

- Refresh tokens are stored as `SHA-256` hashes, never plaintext, and are
  rotated (old token revoked, new one issued) on every `/auth/refresh`
  call — single-use rotation prevents replay of a stolen refresh token
  after its first legitimate use.
- All input DTOs use `class-validator` with a global `ValidationPipe`
  configured `whitelist: true, forbidNonWhitelisted: true` — unexpected
  fields are rejected, not silently dropped or coerced.
- Global exception filter normalizes every error into the same envelope
  and never leaks stack traces or internal exception details to clients.
- Helmet + explicit CORS allow-list (storefront/admin origins only, no
  wildcard) are applied before any route handler runs.
- `.env`, `.env.local`, `.env.*.local` are gitignored; no secret values
  are committed anywhere in the repository (verified by inspection).
- Health/readiness endpoints intentionally require no auth but also leak
  no sensitive data (`{ status, checks: { database, redis } }` only).

## Follow-Up Actions

- [ ] Sprint 1: switch OTP code hashing to HMAC-SHA256 with a server
      secret (finding #4).
- [ ] Sprint 1: raise the minimum JWT secret length enforced by
      `validateApiEnv` and document production secret-management
      requirements (finding #5).
- [ ] Sprint 2/11: add Nginx `limit_req` zones and revisit
      `client_max_body_size` once upload endpoints exist (finding #7).
- [ ] Sprint 12: implement the audit-log module (finding #10).
- [ ] Sprint 15 (or sooner, if a third-party script is introduced first):
      define an explicit Content-Security-Policy (finding #6).
- [ ] Ongoing: re-run `pnpm audit` each sprint and revisit the transitive
      findings table above; consider enabling Dependabot.
