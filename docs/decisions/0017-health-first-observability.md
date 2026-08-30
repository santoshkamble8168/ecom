# ADR 0017: Health-first observability (no local Grafana stack yet)

- Status: Accepted
- Date: 2026-08-30
- Sprint: Sprint 17 — Production Readiness (in progress)

## Context

Sprint 17 asks for Prometheus, Grafana, Loki, OpenTelemetry, and Tempo.
Standing up that stack in local Docker before probes, backups, and a
launch checklist would add operational cost without improving go-live
readiness. The API already exposes liveness/readiness and structured
pino logs with request ids.

## Decision

**1. Probes first.**
`GET /health/live` (process up) and `GET /health/ready` (Postgres +
Redis) are the contract for load balancers and orchestrators. Do not
gate traffic on Meilisearch or MinIO; catalog search already falls
back to Postgres.

**2. No observability stack in Compose until a host exists.**
Local `infrastructure/docker/docker-compose.yml` stays app
dependencies only. Prometheus/Grafana/Loki/Tempo are a revisit when
there is a staging cluster to scrape.

**3. CI security stays `pnpm audit --audit-level=critical`.**
Transitive high/moderate findings remain in sprint security reviews
rather than blocking merges.

## Consequences

- Operators use logs + health, not dashboards, for the first launch.
- Load tests and SLO burn-rate alerts are still open Sprint 17 work.

## Revisit Triggers

- A staging Kubernetes (or similar) environment.
- p95 API latency exceeding the performance budget without query logs
  being enough to diagnose.
