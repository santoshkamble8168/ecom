# ADR 0006: Meilisearch for Product Search

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

Sprint 4 (Product Discovery) and later sprints need fast, typo-tolerant,
faceted product search and filtering (by category, price, size, color,
etc.) that scales with catalog size and returns relevant results in
milliseconds. Postgres full-text search can do basic tokenized search,
but faceting, typo tolerance, and relevance ranking out of the box are
weaker and would require significant custom work to match a
purpose-built search engine. The Sprint 0 plan requires provisioning
this dependency now (`infrastructure/docker/docker-compose.yml`) so
later sprints can build directly on it.

## Decision

Use **Meilisearch** (the `meilisearch` service in
`infrastructure/docker/docker-compose.yml`) as the dedicated product
search engine, indexed from Postgres data by `apps/worker` (search
indexing jobs triggered on product create/update/delete), and queried
directly by `apps/api` (or, for latency-sensitive cases, directly by
`apps/storefront`'s server components) for search/browse/facet
endpoints in Sprint 4+.

## Alternatives Considered

- **Postgres full-text search (`tsvector`/`tsquery`)** — rejected as
  the primary search engine: no built-in typo tolerance, weaker
  out-of-the-box relevance ranking, and facet computation would need to
  be hand-built with aggregate queries that get slower as the catalog
  grows. Still usable later for simple, non-catalog text search (e.g.
  admin order lookup) without conflicting with this decision.
- **Elasticsearch/OpenSearch** — rejected for this stage: far more
  powerful but with a much heavier operational footprint (JVM tuning,
  cluster management, more complex query DSL) than a catalog of the
  planned initial scale needs. Meilisearch's REST API and near-zero
  configuration search-as-you-type/faceting behavior fit a small team
  moving through many sprints faster.
- **Algolia (hosted)** — rejected for local/self-hosted-first
  development and cost predictability; Meilisearch gives equivalent
  developer experience (instant search, typo tolerance, faceting) while
  running fully inside `docker compose` for local dev and staying
  self-hostable in production, avoiding a recurring per-request SaaS
  cost this early.

## Consequences

- Positive: catalog search/faceting in Sprint 4 can be built directly
  against a purpose-built engine instead of retrofitting Postgres full-
  text search later.
- Positive: Meilisearch's Docker image is lightweight and starts fast,
  keeping local dev setup simple (already provisioned and healthy in
  `docker compose up`).
- Negative: introduces a second data store that must be kept in sync
  with Postgres (the source of truth) via explicit indexing jobs in
  `apps/worker` — sync lag/failure handling for this pipeline is a
  Sprint 4 design concern, not solved yet.
- Negative: local dev currently uses a default master key placeholder
  (`devMasterKeyChangeMe`) via Docker Compose env interpolation; flagged
  as an accepted local-only risk in
  `docs/security/sprint-00-security-review.md` (finding #8) and must be
  overridden with a real secret in any deployed environment.

## Revisit Triggers

- Catalog size or query complexity outgrows Meilisearch's capabilities
  (e.g. need for complex aggregations across many facets simultaneously)
  — evaluate Elasticsearch/OpenSearch at that point with real
  production data to justify the added operational cost.
