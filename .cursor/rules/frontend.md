# Frontend Rules

## Purpose
Defines durable engineering expectations for frontend rules across web, mobile, SaaS, API, microservice, enterprise, AI, e-commerce, and internal-tool projects.

## Responsibilities
- Guide AI-assisted work in Cursor.
- Create consistent engineering decisions across teams.
- Protect production quality, maintainability, security, and delivery speed.
- Provide reviewable criteria for planning, implementation, and release.

## Best Practices
- Read requirements and existing documentation before implementation.
- Use simple, typed, testable designs with clear ownership boundaries.
- Prefer composition, reusable contracts, and small cohesive modules.
- Document architectural trade-offs and operational assumptions.
- Validate behavior with tests, observability, and review gates.

## Checklist
- [ ] Requirement and acceptance criteria are understood.
- [ ] Design follows Clean Architecture, SOLID, DRY, KISS, and YAGNI.
- [ ] Security, accessibility, performance, and failure modes are considered.
- [ ] Tests and documentation are updated with the change.
- [ ] Code is self-reviewed before handoff.

## Examples
- Good: create a typed service boundary, add unit and integration tests, and document the API contract.
- Good: reuse an existing validation schema instead of duplicating business rules.
- Good: capture a significant database or architecture decision as an ADR.

## Common Mistakes
- Starting code before reading requirements.
- Adding abstractions without a repeated pattern or clear ownership problem.
- Skipping tests for edge cases, authorization, errors, or migrations.
- Hiding errors with broad catch blocks or silent fallbacks.
- Committing secrets, local-only assumptions, or undocumented behavior.

## AI Instructions
- Read project documentation, `.ai/context/*`, `.ai/memory/project-memory.md`, and relevant rules before changing code.
- Create a plan before broad implementation and keep changes scoped to the requested outcome.
- Prefer existing patterns, reusable contracts, typed interfaces, tests, and documentation updates.
- Self-review for security, performance, accessibility, maintainability, and operations before completion.
- Never introduce placeholder code, fake integrations, generated secrets, or untested critical paths.

## References
- .ai/context/project-conventions.md
- .ai/memory/project-memory.md
- docs/architecture/README.md
- docs/development-workflow.md
- docs/testing-strategy.md
- OWASP ASVS
- WCAG 2.2
- Twelve-Factor App
