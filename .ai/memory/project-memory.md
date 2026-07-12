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
- Current Context: sprint planning documents exist under `documents/sprint-planning` and requirements under `requirement-documents`.
- Default Engineering Strategy: Clean Architecture, DDD where useful, strict typing, reusable validation, documented APIs, automated testing, observability, and secure delivery.

## References
- docs/README.md
- .ai/context
- .cursor/rules/global.md
