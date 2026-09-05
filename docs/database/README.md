# Database Documentation Guide

Schema, integrity, money typing, and migration findings: [Industry standards review — Database](../reviews/industry-standards-review.md#7-database-review). Source of truth for tables: `apps/api/prisma/schema.prisma`. ADR: [0004 PostgreSQL with Prisma](../decisions/0004-postgresql-with-prisma.md).

## Purpose
Starter documentation for database documentation guide in a reusable AI engineering workspace.

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
