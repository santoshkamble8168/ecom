# ADR 0004: PostgreSQL with Prisma as the Primary Datastore

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

The commerce domain planned across Sprints 1–17 (identity, catalog,
inventory, pricing, cart, orders, payments, CMS) is fundamentally
relational: products belong to categories, variants belong to products,
orders reference users/addresses/line-items/payments, and most reads
need multi-table joins with strong consistency (an order total must
always match its line items; inventory must never go negative under
concurrent checkouts). The Sprint 0 database deliverables call for "a
Prisma setup plan for PostgreSQL," domain-aligned schema organization,
and a forward-only migration strategy.

## Decision

Use **PostgreSQL** as the system-of-record relational database, accessed
through **Prisma** as the ORM/migration tool, running as the `postgres`
service in `infrastructure/docker/docker-compose.yml` for local
development. `PrismaService`/`PrismaModule` are `@Global()` in
`apps/api` so every domain module gets a single shared connection pool
(`apps/api/src/prisma/`), and `prisma/schema.prisma` is the single
source of truth for the data model, organized by domain (identity,
platform/audit tables so far, more to come per sprint).

Migrations are forward-only (`prisma migrate dev` / `prisma migrate
deploy`), reviewed in PRs as generated SQL, with seed data
(`prisma/seed.ts` or equivalent) for roles, permissions, and a dev admin
user as domain modules land.

## Alternatives Considered

- **MongoDB / a document store** — rejected: commerce data (orders,
  inventory, pricing) needs strong relational integrity and
  multi-record transactions (e.g. decrement inventory + create order
  line atomically) that a document model makes harder to guarantee
  without application-level two-phase patterns. Postgres's ACID
  transactions map directly onto these invariants.
- **MySQL** — viable alternative, but Postgres was chosen for richer
  native types useful later (JSONB for flexible product attributes,
  full-text search as a fallback, range types, `CHECK` constraints) and
  because Meilisearch/most of the planned tooling has first-class
  Postgres-oriented tutorials and driver support.
- **Raw SQL / query builder (Knex, Drizzle) instead of an ORM** —
  rejected: Prisma's generated, typed client removes an entire class of
  string-based SQL/typo bugs across ~17 sprints of schema growth, and
  its migration tooling (`prisma migrate`) directly satisfies the
  "reviewed schema changes" requirement with generated, diffable SQL
  migration files. Drizzle was considered as a lighter-weight
  alternative but Prisma's tooling maturity (Prisma Studio, migration
  diffing, relation mode configuration) won out for a team standardizing
  conventions from scratch.
- **A separate read replica / CQRS split from day one** — rejected as
  premature; no sprint has yet demonstrated a read-scaling need Postgres
  itself + Redis caching (ADR 0005) can't absorb.

## Consequences

- Positive: one connection pool, one migration history, one place
  (`schema.prisma`) that defines every table — easy to reason about
  referential integrity as new domains are added sprint over sprint.
- Positive: Prisma's generated types flow directly into NestJS services
  and DTOs, keeping the database schema and application types in sync
  without hand-written mapping code.
- Positive: `PrismaService.isHealthy()` gives a cheap, real
  connectivity check wired into `/health/ready`
  (`apps/api/src/health/health.controller.ts`), verified by an e2e test.
- Negative: Prisma's query engine adds a small amount of overhead vs.
  raw `pg` queries, and very complex queries (deep joins/aggregations
  for analytics, Sprint 14) may eventually need raw SQL via
  `prisma.$queryRaw` — acceptable, Prisma supports escaping to raw SQL
  when needed rather than requiring a second tool.
- Negative: schema changes require a migration step in every
  environment (`prisma migrate deploy`), which must be part of the
  deployment pipeline (tracked for Sprint 17 — production readiness).

## Revisit Triggers

- A specific domain (e.g. analytics/reporting, Sprint 14) needs
  read-query patterns Postgres+Prisma can't serve efficiently even with
  indexing/materialized views — evaluate a dedicated read store at that
  point, not before.
