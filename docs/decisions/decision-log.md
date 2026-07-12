# Decision Log

## Purpose
Starter documentation for decision log in a reusable AI engineering workspace.

## Architecture Decision Records

| ADR | Title | Status | Sprint |
| --- | --- | --- | --- |
| [0001](./0001-modular-monolith-architecture.md) | Modular monolith over microservices for the backend | Accepted | Sprint 0 |
| [0002](./0002-nextjs-app-router-for-frontends.md) | Next.js 15 App Router for storefront and admin | Accepted | Sprint 0 |
| [0003](./0003-nestjs-for-api-and-worker.md) | NestJS for the API and worker services | Accepted | Sprint 0 |
| [0004](./0004-postgresql-with-prisma.md) | PostgreSQL with Prisma as the primary datastore | Accepted | Sprint 0 |
| [0005](./0005-redis-for-cache-sessions-and-rate-limiting.md) | Redis for caching, rate limiting, and future queues/sessions | Accepted | Sprint 0 |
| [0006](./0006-meilisearch-for-product-search.md) | Meilisearch for product search | Accepted | Sprint 0 |
| [0007](./0007-minio-for-object-storage.md) | MinIO (S3-compatible) for object storage | Accepted | Sprint 0 |
| [0008](./0008-tailwind-and-shadcn-style-design-system.md) | Tailwind CSS + shadcn/ui-style component architecture for `@ecom/ui` | Accepted | Sprint 0 |

See also: [Sprint 0 security review](../security/sprint-00-security-review.md).

## Responsibilities
- Provide a durable source of truth.
- Support onboarding and AI context retrieval.
- Capture architecture, workflow, operational, and delivery decisions.

## Best Practices
- Keep docs versioned with code.
- Update docs in the same change as behavior changes.
- Prefer diagrams and examples when they clarify decisions.
- Link ADRs, APIs, runbooks, tests, and releases.

## Checklist
- [ ] Purpose and audience are clear.
- [ ] Current project state is accurate.
- [ ] Operational and testing guidance is present.
- [ ] Related docs are linked.
- [ ] Stale assumptions are removed.

## Examples
- Document how to run tests, deploy, rollback, and troubleshoot a feature.
- Record why a technology was chosen and when to revisit it.

## Common Mistakes
- Treating docs as a one-time deliverable.
- Duplicating conflicting instructions.
- Leaving setup, secrets, or environment assumptions implicit.

## References
- .ai/context
- .ai/memory/project-memory.md
- .cursor/rules/documentation.md
