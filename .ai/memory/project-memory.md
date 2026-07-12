# Project Memory

## Purpose
Reusable memory file that gives AI agents durable project orientation before planning or coding.

## Responsibilities
- Capture project name, goals, stack, architecture, conventions, decisions, API style, database strategy, testing strategy, deployment strategy, and security rules.
- Act as the first file AI should read before implementation.
- Preserve decisions that should survive across sessions.

## Best Practices
- Keep memory concise but specific.
- Update memory when major decisions change.
- Link to detailed docs instead of duplicating everything.
- Mark unknowns explicitly.

## Checklist
- [ ] Project name recorded.
- [ ] Goals and non-goals recorded.
- [ ] Folder structure and coding standards recorded.
- [ ] Design decisions and API/database strategy recorded.
- [ ] Testing, deployment, and security rules recorded.

## Examples
- Project: ecom; Goal: production-grade commerce platform and reusable AI engineering workspace; Principle: Clean Architecture, strict TypeScript, security-first delivery, complete documentation.

## Common Mistakes
- Letting memory become stale.
- Recording secrets or environment-specific credentials.
- Using vague rules that do not guide implementation.

## Project Snapshot
- Project Name: ecom
- Primary Goal: production-grade commerce application planning baseline plus reusable AI engineering workspace.
- Current Context: **Sprint 2 (Catalog Foundation) is Done** (functional; formal docs deferred). **Sprint 3 (Storefront Foundation) is In Progress** — CMS/navigation Prisma models + seed; storefront API (`/home`, `/navigation`, `/search/suggestions`, `/search/trending`, `/newsletter/subscribe`); data-driven homepage (hero, social proof, shop-by-gender, collection/product rails, trust badges, newsletter); enhanced header (announcement bar, mobile drawer, search overlay), footer, `/search` page.
- Sprint Completion Process (apply automatically at the end of every sprint going forward): before marking any sprint `Done` in `documents/sprint-planning/README.md`, (1) verify every Definition of Done item from that README is actually met — implementation, OpenAPI/Storybook updates, Docker/env/CI updates, unit+integration+e2e+accessibility+performance checks passing or explicitly documented, and a completed security review; (2) write a sprint summary at `docs/sprints/sprint-NN-<slug>-summary.md`; (3) write release notes at `docs/release-notes/vX.Y.Z-sprint-N.md`; (4) update the sprint's own plan file status line and the tracker table/status in `documents/sprint-planning/README.md`; (5) update this project-memory.md Current Context paragraph. Do not mark a sprint `Done` until all five steps are complete.
- Default Engineering Strategy: Clean Architecture, DDD where useful, strict typing, reusable validation, documented APIs, automated testing, observability, and secure delivery.

## References
- docs/README.md
- .ai/context
- .cursor/rules/global.md
- docs/decisions/decision-log.md
- docs/security/sprint-00-security-review.md
- docs/sprints/sprint-00-project-foundation-summary.md
