# API Documentation Guide

## Notification APIs (Sprint 13)

Prefix `api/v1`. JWT required. OpenAPI tags: `me-notifications`,
`admin-notifications`.

- Shopper: `GET` / `PATCH` `/me/notification-preferences` (marketing
  opt-in only on PATCH).
- Admin: `/admin/notifications/templates` (list/create, get/patch,
  versions, publish, preview, test-send) and
  `/admin/notifications/deliveries`. Permissions `notification:read`
  / `notification:write`.

See [architecture](../notifications/architecture-and-templates.md) and
[ADR 0013](../decisions/0013-notifications-queue-and-templates.md).

## Analytics APIs (Sprint 14)

Prefix `api/v1`. OpenAPI tags: `analytics`, `admin-analytics`.

- Public ingest: `POST /analytics/events` (optional JWT, 202).
- Admin: `GET /admin/analytics/kpis|funnels|search|products|cohorts`
  (`analytics:read`). Reports by type: `GET /admin/reports/:type`.

See [taxonomy](../analytics/event-taxonomy.md) and
[ADR 0014](../decisions/0014-analytics-ingest-and-retention.md).

## SEO (Sprint 15)

Storefront (crawler host): `/robots.txt`, `/sitemap.xml`.
API origin (excluded from `api/v1`): `GET /robots.txt`, `GET /sitemap.xml`.
Public catalog GETs send `Cache-Control: public, s-maxage=60`.

See [SEO checklist](../seo/checklist.md) and
[ADR 0015](../decisions/0015-seo-and-cache.md).

## Purpose
Starter documentation for api documentation guide in a reusable AI engineering workspace.

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
