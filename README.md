# ecom

## Purpose
Production-grade commerce project workspace with a reusable AI Engineering Framework for planning, implementation, testing, review, deployment, and release.

## Responsibilities
- Keep `.ai/` as reusable AI operating knowledge: agents, prompts, workflows, checklists, templates, context, memory, and skills.
- Keep `.cursor/` as Cursor-specific rules, prompts, skills, agents, and workflows.
- Keep `docs/` as the durable engineering source of truth.
- Keep `tests/` and `playwright/` ready for automated quality gates.

## Best Practices
- Read `.ai/memory/project-memory.md` and relevant docs before coding.
- Plan before implementation and document architectural decisions.
- Follow Clean Architecture, SOLID, DRY, KISS, YAGNI, secure defaults, accessibility, performance, and test-first delivery.
- Update docs and tests in the same change as behavior updates.

## Checklist
- [ ] Requirements are understood.
- [ ] Plan and acceptance criteria are documented.
- [ ] Code follows project rules.
- [ ] Tests and docs are updated.
- [ ] Security, performance, accessibility, and operations are reviewed.

## Examples
- Start a feature from `.ai/prompts/build-feature.md`.
- Review a PR with `.ai/checklists/code-review.md` and `.github/PULL_REQUEST_TEMPLATE.md`.
- Plan a release with `.ai/workflows/release.md` and `.ai/checklists/release.md`.

## Common Mistakes
- Generating code before reading requirements and context.
- Skipping tests, docs, security, or rollback planning.
- Duplicating business rules instead of centralizing contracts and validation.

## References
- `.ai/memory/project-memory.md`
- `.cursor/rules/global.md`
- `docs/README.md`
- `documents/sprint-planning/README.md`
