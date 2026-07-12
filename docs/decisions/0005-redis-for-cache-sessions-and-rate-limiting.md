# ADR 0005: Redis for Caching, Rate Limiting, and Future Queues/Sessions

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

Several cross-cutting concerns need fast, ephemeral, shared state across
`apps/api` and `apps/worker` processes: OTP rate limiting, request
throttling, future session/refresh-token lookups, and future job queues
for `apps/worker` (emails, search indexing). The Sprint 0 deliverables
explicitly list a "cache" and "queue" cross-cutting module, and the
readiness endpoint (`/health/ready`) needed a second real dependency
check beyond the database to prove the pattern generalizes.

## Decision

Use **Redis** (the `redis` service in
`infrastructure/docker/docker-compose.yml`) as the shared in-memory store
for:

- **Rate limiting** — `@nestjs/throttler`'s default in-memory store is
  fine for a single API instance, but Redis is the natural next step
  for multi-instance deployments; the throttler module is already
  configured centrally in `AppModule` so swapping its storage adapter to
  a Redis-backed one later is a config change, not a rewrite (see
  `docs/security/sprint-00-security-review.md` finding #1).
- **Health/readiness signal** — `RedisService` extends `ioredis`'s
  client directly, exposes `isHealthy()` via `PING`/`PONG`, and is
  checked in `/health/ready` alongside Postgres
  (`apps/api/src/redis/redis.service.ts`,
  `apps/api/src/health/health.controller.ts`).
- **Planned (future sprints)**: general-purpose response/query caching,
  session/refresh-token fast-lookup, and as the backing store for a job
  queue (e.g. BullMQ) consumed by `apps/worker`.

`RedisService`/`RedisModule` are `@Global()`, mirroring the
`PrismaService`/`PrismaModule` pattern from ADR 0004, so any future
domain module can inject `RedisService` without additional wiring.

## Alternatives Considered

- **In-process memory cache only (no Redis)** — rejected: doesn't
  survive process restarts or scale across multiple API instances, which
  the sprint plan's later horizontal-scaling and worker-queue needs
  require.
- **Memcached** — rejected: Redis's richer data structures (sorted
  sets, lists, pub/sub) are needed for planned queue and rate-limiting
  use cases that plain key-value caching (Memcached's core strength)
  doesn't cover as cleanly.
- **Database-backed queue/rate-limit (Postgres tables)** — rejected as
  the primary mechanism: would add write load and locking contention to
  the primary transactional database for high-frequency, low-value data
  (rate-limit counters, job state) that's a natural fit for an
  in-memory store instead.

## Consequences

- Positive: one more Docker Compose dependency, but a well-understood,
  single-purpose one; `RedisService.isHealthy()` gives immediate
  operational visibility.
- Positive: establishes the `@Global()` infrastructure-module pattern a
  second time (after Prisma), making it the obvious template for any
  future infrastructure dependency (e.g. Meilisearch client, MinIO
  client) added in later sprints.
- Negative: another moving part in local dev (`docker compose up`) and
  in production (needs its own memory sizing/eviction policy once real
  caching workloads exist) — acceptable given the functionality it
  unlocks.
- Negative: current rate-limiting still uses `@nestjs/throttler`'s
  default in-memory storage, not Redis-backed storage, so limits are
  per-process rather than global across horizontally scaled API
  instances — explicitly tracked as a near-term follow-up once the API
  runs more than one replica.

## Revisit Triggers

- The API is deployed with more than one replica — switch
  `@nestjs/throttler`'s storage adapter to Redis-backed storage so rate
  limits are enforced globally, not per-instance.
- `apps/worker` needs a real job queue — introduce BullMQ (or similar)
  on top of this same Redis instance rather than adding a new
  dependency.
