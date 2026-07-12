# ADR 0007: MinIO (S3-Compatible) for Object Storage

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

The platform will need to store binary assets outside the relational
database: product images (Sprint 2/11), CMS media (Sprint 11), and
possibly user-uploaded content (reviews, avatars) in later sprints.
Storing these as bytes in Postgres would bloat the database, complicate
backups, and hurt query performance. The Sprint 0 plan requires
provisioning an object-storage dependency now so upload flows can be
built directly against a stable API in later sprints without a storage
migration mid-project.

## Decision

Use **MinIO** (the `minio` service in
`infrastructure/docker/docker-compose.yml`) as an S3-API-compatible
object store for local development and self-hosted deployments. All
application code that needs to read/write objects will do so through
the standard S3 SDK/API surface (e.g. `@aws-sdk/client-s3`) rather than
a MinIO-specific client, so the same code can point at AWS S3 (or any
other S3-compatible provider) in production simply by changing the
endpoint/credentials configuration — no application code change
required.

## Alternatives Considered

- **Store files directly on the API/worker container filesystem** —
  rejected: not durable across container restarts/redeploys, doesn't
  scale across multiple instances, and has no built-in
  versioning/lifecycle features.
- **Store binaries in Postgres (`bytea`/large objects)** — rejected:
  bloats database size and backups, and Postgres is explicitly reserved
  for relational, transactional data per ADR 0004.
- **Go straight to AWS S3 for local dev too** — rejected: would require
  every developer to have AWS credentials and incur cost/network
  dependency just to run the app locally, and would make offline
  development impossible. MinIO gives an identical API surface with zero
  cost and zero network dependency locally.
- **Google Cloud Storage / Azure Blob as the target production
  provider** — not decided against, but deliberately deferred: because
  the S3 API is the de facto standard, choosing MinIO for local dev
  keeps the door open to any S3-compatible provider (AWS S3, Cloudflare
  R2, Backblaze B2, or a self-hosted MinIO cluster) without re-deciding
  this ADR — the actual production provider is a deployment-time
  configuration choice, not an application code decision.

## Consequences

- Positive: upload/download code written against the S3 API in
  Sprint 2/11 will work unchanged against local MinIO and production S3
  (or another S3-compatible provider) — no storage-layer rewrite needed
  when moving from local dev to production.
- Positive: MinIO's web console gives immediate local visibility into
  uploaded objects during development without extra tooling.
- Negative: local dev again uses convenience default credentials
  (`ecomminio` / `ecomminio123`) via Docker Compose env interpolation;
  flagged as an accepted local-only risk in
  `docs/security/sprint-00-security-review.md` (finding #8) and must be
  overridden with a real secret/IAM policy in any deployed environment.
- Negative: no bucket lifecycle policies, CDN integration, or image
  transformation pipeline exist yet — deferred to the sprint that
  actually implements image upload (Sprint 2 catalog images / Sprint 11
  CMS media).

## Revisit Triggers

- When choosing the production storage provider (AWS S3 vs. R2 vs.
  self-hosted MinIO vs. other), document that choice in a follow-up ADR
  once deployment infrastructure (Sprint 17) is decided — this ADR only
  commits to the S3-compatible API contract, not a specific production
  vendor.
