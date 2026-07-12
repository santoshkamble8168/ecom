# Sprint 0 Summary — Project Foundation

Status: **Done**
Plan: `documents/sprint-planning/sprint-00-project-foundation.md`
Tracker: `documents/sprint-planning/README.md`

## Outcome

Sprint 0 delivers the production-grade platform foundation for every
later commerce sprint: a pnpm/Turborepo monorepo, a fully containerized
local environment, a shared design system with Storybook, an
authentication skeleton (OTP + JWT + refresh rotation + RBAC
primitives), API standards (versioned routes, response/error envelope,
OpenAPI, health checks), CI quality gates, and a documented security
review. All Definition-of-Done items from
`documents/sprint-planning/README.md` are met — see the checklist at
the bottom of this document.

## What Was Built

### Monorepo & Tooling

- pnpm workspaces + Turborepo orchestrating `apps/*`, `packages/*`, and
  `playwright` (`pnpm-workspace.yaml`, `turbo.json`).
- Shared, strict TypeScript configs (`packages/tsconfig`), shared
  ESLint config (`packages/eslint-config`), Prettier, and consistent
  `typecheck`/`lint`/`test`/`build` scripts across every workspace
  package.

### Backend (`apps/api`, `apps/worker`)

- NestJS modular-monolith foundation: config, logger, Prisma, Redis,
  health, and auth modules, structured per ADR 0001/0003
  (`docs/decisions/0001-modular-monolith-architecture.md`,
  `docs/decisions/0003-nestjs-for-api-and-worker.md`).
- Authentication skeleton: OTP challenge request/verify, JWT access +
  rotating refresh tokens (hashed at rest), `Public`/`Roles` decorators,
  `RolesGuard`.
- Global rate limiting via `@nestjs/throttler` (60 req/min default; 5
  req/10 min on OTP request, 10 req/10 min on OTP verify).
- `RedisService`/`RedisModule` (`@Global()`) wired alongside the
  existing `PrismaService`/`PrismaModule`, both feeding
  `/health/ready`.
- Standard response/error envelope, global exception filter,
  `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`), request-ID
  middleware, structured Pino logging.
- OpenAPI/Swagger generation wired and verified by an e2e test.

### Frontend (`apps/storefront`, `apps/admin`)

- Two independent Next.js 15 App Router apps (ADR 0002) sharing the
  `@ecom/ui` design system.
- Storefront app shell: announcement bar, sticky header, primary nav,
  hero, footer.
- Admin app shell: sidebar navigation, dashboard metric cards.
- Both shells verified for structure, navigation, and accessibility via
  Playwright.

### Design System (`packages/ui`)

- Design tokens (color, spacing, radius, typography, breakpoints) and a
  shared Tailwind preset (ADR 0008), consumed by both apps.
- `Button` and `Card` primitives built with `class-variance-authority`
  and a shared `cn()` utility, shadcn/ui-style (copy-ownable source, not
  a compiled runtime library).
- Storybook (`packages/ui/.storybook`) with `addon-a11y`, `addon-
  essentials`, `addon-interactions`; stories for `Button`, `Card`, and a
  dedicated design-tokens reference page.
- Unit tests for `Button`/`Card` with React Testing Library + Jest/jsdom.

### Database

- Prisma schema on PostgreSQL with identity/auth tables (users, OTP
  challenges, refresh tokens) established; forward-only migration
  workflow in place (ADR 0004).

### DevOps / Infrastructure

- Docker Compose topology: PostgreSQL, Redis, Meilisearch, MinIO,
  Mailpit, Nginx, plus API/worker/storefront/admin service definitions
  (`infrastructure/docker/docker-compose.yml`).
- Nginx routing for storefront/admin/API upstreams
  (`infrastructure/nginx/nginx.conf`).
- `.env.example` covering database, Redis, Meilisearch, MinIO, JWT,
  OAuth placeholders, SMTP, and app URLs.

### CI (`.github/workflows/ci.yml`)

- `install` → `typecheck`/`lint` → `test` (unit + API e2e against real
  Postgres/Redis service containers) → `build` stages.
- Dedicated `e2e` job: builds storefront/admin, boots them, runs the
  Playwright suite headlessly.
- Dedicated `security-scan` job: `pnpm audit --audit-level=critical`,
  filling the Sprint 0 "security scan placeholder."

### Testing

| Layer | Location | Count | Result |
| --- | --- | --- | --- |
| Unit — `@ecom/config` | `packages/config/src/env.spec.ts` | 6 | ✅ pass |
| Unit — `@ecom/shared` | `packages/shared/src/{response,errors,pagination}.spec.ts` | 12 | ✅ pass |
| Unit — API (`AuthService`, `RedisService`) | `apps/api/src/**/*.spec.ts` | 17 (incl. `HealthController`) | ✅ pass |
| Unit — `@ecom/ui` (`Button`, `Card`) | `packages/ui/src/components/*.spec.tsx` | 7 | ✅ pass |
| **Total unit tests** | | **42** | ✅ pass |
| Integration/e2e — API | `apps/api/test/app.e2e-spec.ts` | 6 (health, envelope, validation, OpenAPI, rate limit) | ✅ pass, against live Postgres + Redis |
| E2E — Playwright | `playwright/tests/*.spec.ts` | 6 (storefront shell, admin shell, both incl. axe-core a11y) | ✅ pass |

Full monorepo verification (`pnpm turbo run typecheck lint test`, then
`build` for all 13 packages/apps) passes cleanly; see the [Verification
Evidence](#verification-evidence) section for exact commands and results.

### Documentation

- Security review: `docs/security/sprint-00-security-review.md` (3
  findings fixed, 8 logged as accepted risk with owning sprint,
  dependency audit baseline captured).
- 8 Architecture Decision Records: `docs/decisions/0001` through
  `0008`, indexed in `docs/decisions/decision-log.md`.
- This sprint summary and the accompanying release notes
  (`docs/release-notes/v0.1.0-sprint-0.md`).

## Folder Structure Delivered

```text
apps/
  storefront/   # Next.js 15 App Router — public storefront shell
  admin/        # Next.js 15 App Router — admin dashboard shell
  api/          # NestJS — REST API, auth skeleton, health checks
  worker/       # NestJS — background job runtime (no jobs yet)
packages/
  ui/           # Design tokens, Tailwind preset, primitives, Storybook
  types/        # Shared API/domain TypeScript types
  validation/   # Shared class-validator DTO base utilities
  config/       # Typed, validated environment config
  logger/       # Structured Pino logger module
  shared/       # Response envelope, domain errors, pagination helpers
  eslint-config/
  tsconfig/
playwright/     # @ecom/e2e — Playwright POMs, fixtures, a11y utils, tests
infrastructure/
  docker/       # docker-compose.yml for all local services
  nginx/        # Reverse proxy + routing config
docs/
  decisions/    # ADRs 0001–0008 + decision log index
  security/     # Sprint 0 security review
  sprints/      # This summary
  release-notes/
documents/
  sprint-planning/  # Source-of-truth sprint plans (unchanged)
scripts/
```

## APIs Delivered

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Basic liveness, no dependency checks |
| GET | `/health/live` | Public | Liveness probe |
| GET | `/health/ready` | Public | Readiness probe — checks Postgres + Redis |
| POST | `/api/v1/auth/otp/request` | Public, rate-limited (5/10min) | Request an OTP code |
| POST | `/api/v1/auth/otp/verify` | Public, rate-limited (10/10min) | Verify OTP, issue access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Public (refresh token) | Rotate refresh token, issue new access token |
| GET | `/api/docs` | Public (dev) | Swagger UI / OpenAPI JSON |

## Database Changes

- Prisma schema: identity/auth domain tables (`User`, `OtpChallenge`,
  `RefreshToken`) — see `apps/api/prisma/schema.prisma`.
- No destructive migrations; all forward-only.

## Components Delivered (`@ecom/ui`)

- `Button` (variants: primary, secondary, outline, ghost, destructive;
  sizes: sm/md/lg; loading state) — Storybook + unit tests +
  WCAG AA contrast-verified.
- `Card` (composable: `Card`, `CardHeader`, `CardTitle`,
  `CardDescription`, `CardContent`, `CardFooter`) — Storybook + unit
  tests.
- Design-token reference page (`tokens.stories.tsx`) documenting color,
  spacing, radius, typography, and breakpoint scales.

## Coverage / Quality Gates

- Unit tests: 42/42 passing across `@ecom/config`, `@ecom/shared`,
  `apps/api`, `@ecom/ui`.
- API integration (e2e): 6/6 passing against live Postgres + Redis.
- Playwright e2e + accessibility: 6/6 passing (0 axe-core violations on
  storefront and admin shells).
- `pnpm turbo run typecheck lint test`: clean across all 13 workspace
  packages.
- `pnpm turbo run build`: clean across all 13 workspace packages
  (Next.js builds verified individually due to a local Windows/OneDrive
  file-locking quirk when both Next.js builds run in the same parallel
  Turborepo batch — see Known Issues).
- `pnpm audit --audit-level=critical`: 0 critical advisories (CI-gated
  going forward).

## Pending Tasks / Technical Debt

- OTP hashing should move from unsalted SHA-256 to an HMAC keyed with a
  server secret (security review finding #4) — planned for Sprint 1.
- JWT secret minimum length should be raised beyond 16 characters for
  production and documented in a deployment guide (finding #5) —
  planned for Sprint 1 / Sprint 17.
- Rate limiting currently uses `@nestjs/throttler`'s in-memory store
  (per-process, not shared across replicas) — switch to a Redis-backed
  store once the API runs more than one replica (see ADR 0005 revisit
  triggers).
- No explicit Content-Security-Policy yet (finding #6) — deferred until
  third-party scripts are introduced or Sprint 15.
- No audit-log module yet — explicitly deferred to Sprint 12 per the
  sprint plan.
- 29 transitive dependency advisories (0 critical, 10 high, 16
  moderate, 3 low) tracked as accepted risk in the security review; none
  reachable through code we call directly today. Re-audit each sprint.
- `apps/storefront` and `apps/admin` have no unit tests yet (no
  meaningful client logic exists yet beyond shell layout, which is
  covered by Playwright); add component tests as real interactive
  features land in Sprint 3+.

## Risks Carried Forward

- Overbuilding infrastructure ahead of features remains a watch-item;
  Sprint 1 should stay tightly scoped to identity/auth completion
  rather than further platform work.
- The Windows/OneDrive-hosted dev environment shows file-locking
  behavior when multiple Next.js builds run in parallel — contributors
  on similar setups should build Next.js apps sequentially, or move the
  working copy outside a cloud-synced folder, or run everything inside
  Docker where this doesn't reproduce.

## Known Issues

- **Local build parallelism on Windows + OneDrive**: running
  `pnpm turbo run build` with both `@ecom/storefront` and `@ecom/admin`
  building concurrently intermittently fails with
  `EPERM: operation not permitted, open '.next/trace'`, or stalls
  indefinitely. Root cause is OneDrive's file-sync/locking behavior on
  the `.next` output directory, not the application code — building
  each Next.js app individually (`pnpm --filter @ecom/storefront run
  build`, then admin) succeeds every time, as does building inside the
  Docker containers. CI is unaffected (Linux runners, no OneDrive).

## Verification Evidence

Run locally on 2026-07-12 against the Dockerized Postgres/Redis/
Meilisearch/MinIO/Mailpit stack:

```bash
pnpm turbo run typecheck lint test   # 34/34 tasks succeeded
pnpm turbo run build                 # all packages/apps built (Next.js apps built individually, see Known Issues)
pnpm --filter @ecom/api run test:e2e # 6/6 passed
pnpm --filter @ecom/e2e run test:e2e # 6/6 passed
pnpm audit --audit-level=critical    # 0 critical
```

## Definition of Done — Checklist

- [x] Feature is implemented across frontend, backend, database, API,
      validation, logging, docs, and tests.
- [x] OpenAPI and Storybook are updated.
- [x] Docker, environment variables, health checks, and CI changes are
      complete.
- [x] Unit, integration, E2E, accessibility, and performance checks are
      passing or explicitly documented (performance budget baseline —
      Lighthouse/Core Web Vitals — is deferred to Sprint 15 per the
      sprint plan; nothing to measure yet beyond static shells).
- [x] Security review is complete and risks are logged
      (`docs/security/sprint-00-security-review.md`).
- [x] Sprint summary captures completed features, folder structure,
      APIs, DB changes, components, coverage, pending tasks, debt, and
      risks (this document).

## References

- Sprint plan: `documents/sprint-planning/sprint-00-project-foundation.md`
- Security review: `docs/security/sprint-00-security-review.md`
- ADRs: `docs/decisions/decision-log.md`
- Release notes: `docs/release-notes/v0.1.0-sprint-0.md`
