# ADR 0001: Modular Monolith Over Microservices for the Backend

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

The platform needs a backend architecture for `apps/api` (customer/admin
facing HTTP API) and `apps/worker` (background jobs) that can support the
full commerce domain planned across Sprints 1–17: identity, catalog,
cart, checkout, payments, orders, inventory, pricing, CMS, notifications,
analytics, and admin operations. The team is small and the domain
boundaries (catalog vs. orders vs. payments, etc.) are not yet proven in
production. `documents/sprint-planning/sprint-00-project-foundation.md`
lists "Pending Decisions" including package manager and build
orchestrator, but the backend topology (monolith vs. services) needed to
be settled before any module code could be written.

## Decision

Build the backend as a **modular monolith** inside two NestJS
applications (`apps/api`, `apps/worker`) that share domain and
infrastructure code through internal workspace packages, organized in
layers:

- **API layer** — controllers, DTOs, guards, decorators (`apps/api/src/*`).
- **Application layer** — services orchestrating use cases
  (`*.service.ts`).
- **Domain layer** — business rules and entities, framework-agnostic
  where practical.
- **Infrastructure layer** — Prisma, Redis, external SDKs
  (`apps/api/src/prisma`, `apps/api/src/redis`).

Each business capability (auth, catalog, cart, orders, ...) is a NestJS
module with its own controllers/services/DTOs, imported into a single
`AppModule`. Cross-cutting concerns (config, logger, auth, cache, queue,
events, audit, health, OpenAPI) are `@Global()` modules imported once, as
already implemented for `RedisModule` (`apps/api/src/redis/redis.module.ts`)
and `AppConfigModule`.

`apps/worker` remains a separate deployable NestJS process for
asynchronous/background jobs (emails, search indexing, etc.), sharing the
same Prisma schema and `packages/*` code as `apps/api`, but is not split
further into per-domain services at this stage.

## Alternatives Considered

- **Microservices per domain (catalog service, order service, payment
  service, ...)** — rejected for now. Domain boundaries are still
  shifting sprint-to-sprint per the sprint plan, and microservices would
  add distributed-transaction complexity (sagas, eventual consistency),
  operational overhead (service discovery, per-service CI/CD, more Docker
  Compose services), and network latency for a team that hasn't yet
  validated the domain model in production. Premature service
  boundaries are explicitly called out as a risk in the Sprint 0 plan
  ("Overbuilding infrastructure before domain features may slow
  delivery").
- **Single unstructured NestJS app with no internal module boundaries**
  — rejected because it would make future extraction into services (if
  ever needed) much harder, and would erode the Clean Architecture
  layering the project standardizes on (`.cursor/rules/architecture.md`,
  `.cursor/rules/clean-architecture` skill).

## Consequences

- Positive: one deployable unit to build/test/observe for the API; no
  distributed tracing or service mesh needed yet; refactoring domain
  boundaries is a local code change, not a cross-service migration;
  simpler local dev (`docker compose up` runs 2 backend processes, not
  N).
- Positive: internal module boundaries (one NestJS module per domain,
  explicit imports/exports) keep the door open to extracting a hot-path
  domain (e.g. search or notifications) into its own service later
  without a full rewrite.
- Negative: a bug or resource spike in one domain module can affect the
  whole `apps/api` process (no per-domain fault isolation). Mitigated by
  the worker process already being separate for anything long-running or
  bursty (emails, indexing).
- Negative: all domain modules currently share one Postgres database and
  one deploy cadence; a future decision to split out a service will
  require its own ADR and a data-ownership migration plan.

## Revisit Triggers

- A specific domain (e.g. search, notifications, payments) needs an
  independent scaling or deployment cadence from the rest of the API.
- Team size grows enough that multiple teams need to own and deploy
  independently.
