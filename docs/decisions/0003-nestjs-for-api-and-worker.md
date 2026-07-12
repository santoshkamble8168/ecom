# ADR 0003: NestJS for the API and Worker Services

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

`apps/api` needs to serve a versioned REST API (`/api/v1`) with a
standard response/error envelope, OpenAPI generation, guards/decorators
for auth and RBAC, validation, and structured logging — all called out
explicitly in the Sprint 0 API deliverables. `apps/worker` needs to run
background jobs (emails, search indexing, notifications) sharing the
same domain code and Prisma schema as the API. See ADR 0001 for why both
live inside one modular-monolith-style codebase rather than being split
into microservices.

## Decision

Use **NestJS** (TypeScript-first, decorator-based, dependency-injection
framework built on Express) for both `apps/api` and `apps/worker`.

Concretely, this sprint's implementation established:

- `@nestjs/config` + custom validation (`packages/config`) for typed,
  validated environment variables, injected via the `APP_ENV` token
  (`apps/api/src/config/config.module.ts`).
- `@nestjs/swagger` for OpenAPI generation directly from controllers and
  DTOs, satisfying the "OpenAPI baseline" deliverable.
- `class-validator` + a global `ValidationPipe`
  (`whitelist: true, forbidNonWhitelisted: true`) for DTO validation.
- A global exception filter and interceptor producing the standard
  success/error envelope (`packages/shared/src/response.ts`,
  `packages/shared/src/errors.ts`), so every endpoint returns a
  consistent shape.
- Guards and decorators for auth (`@Public()`) and RBAC (`RolesGuard`,
  `@Roles()`), and now rate limiting (`@nestjs/throttler`, see
  `docs/security/sprint-00-security-review.md` finding #1).
- `@Global()` infrastructure modules (`PrismaModule`, `RedisModule`) so
  any domain module can inject `PrismaService`/`RedisService` without
  re-importing them.
- `RequestIdMiddleware` for per-request correlation IDs threaded through
  logs.

## Alternatives Considered

- **Express or Fastify directly, hand-rolled structure** — rejected:
  would require rebuilding what NestJS gives for free (DI container,
  module system, decorator-based guards/pipes/interceptors, first-class
  OpenAPI integration) and would make it harder to enforce the
  layered/module structure from ADR 0001 consistently across
  contributors.
- **Fastify-based NestJS adapter instead of the default Express
  adapter** — considered for raw throughput, but rejected for Sprint 0:
  the Express adapter has the broadest middleware/plugin compatibility
  (Helmet, Swagger UI, Multer) and the team has more operational
  familiarity with it; raw HTTP throughput is not yet a bottleneck for
  any Sprint 0–17 traffic target. Can reconsider per-service if a
  specific hot path (e.g. search proxy) needs it.
- **tRPC** — rejected: the platform explicitly needs a public,
  documented REST API (`/api/v1` + OpenAPI/Swagger, per Sprint 0 API
  deliverables) for potential third-party/partner consumption, not just
  typed calls between our own Next.js frontends and API.

## Consequences

- Positive: consistent module structure across every future domain
  (catalog, cart, orders, ...) because NestJS enforces
  module/controller/provider separation by convention.
- Positive: OpenAPI docs stay accurate automatically as controllers
  evolve, verified by an e2e test asserting the Swagger JSON is
  generated (`apps/api/test/app.e2e-spec.ts`).
- Positive: guards/interceptors/pipes give a single place to enforce
  cross-cutting policy (auth, RBAC, rate limits, validation, response
  shape) instead of per-route boilerplate.
- Negative: NestJS's decorator/DI model has a learning curve and more
  ceremony than a minimal Express app for very simple endpoints (e.g.
  health checks) — accepted as a reasonable tradeoff for consistency
  across ~17 sprints of domain modules.
- Negative: pulls in transitive dependencies (e.g. `multer`, `lodash`,
  `js-yaml` via `@nestjs/swagger`/`@nestjs/config`) that occasionally
  carry advisories not directly exploitable in our code paths today;
  tracked in `docs/security/sprint-00-security-review.md`.

## Revisit Triggers

- A specific route or service needs materially higher raw throughput
  than the Express adapter provides — evaluate switching that
  service's adapter to Fastify rather than rewriting the whole
  framework choice.
