# Documentation Workflow

## Purpose
Defines the repeatable workflow for Documentation activities.

## Responsibilities
- Coordinate roles, artifacts, quality gates, and handoffs.
- Prevent skipped planning, testing, documentation, or operational work.
- Make work repeatable across projects and teams.

## Best Practices
- Use the smallest workflow that satisfies risk and scope.
- Record assumptions and decisions as durable docs.
- Keep quality gates visible from start to finish.
- Do not merge or release without verification evidence.

## Checklist
- [ ] Entry criteria satisfied.
- [ ] Plan and acceptance criteria documented.
- [ ] Implementation or review complete.
- [ ] Required tests pass or exceptions are approved.
- [ ] Exit criteria satisfied.

## Examples
- New Feature moves from user story to technical design, implementation, tests, docs, review, and release notes.

## Common Mistakes
- Treating workflows as paperwork after implementation.
- Skipping rollback and monitoring for releases.
- Proceeding with unclear ownership.
- Accepting unverified manual claims.

## Entry Criteria
- Business goal, owner, priority, and expected outcome are known.
- Required context, designs, APIs, data, environments, and dependencies are available or explicitly marked as assumptions.

## Step-By-Step Process
1. Read project memory, context, rules, and related documentation.
2. Define scope, non-goals, risks, acceptance criteria, and impacted systems.
3. Create or update the plan, design, test strategy, and documentation outline.
4. Implement in small reviewable increments with typed contracts and clear ownership boundaries.
5. Run unit, integration, E2E, security, accessibility, and performance checks appropriate to risk.
6. Self-review, document decisions, update release or operational notes, and prepare handoff.

## Exit Criteria
- Acceptance criteria are met and verified.
- Tests and documentation are updated.
- Security, performance, accessibility, and operational risks are resolved or documented.
- Handoff includes release notes, rollback notes, and known limitations when relevant.

## Deliverables
- Plan, implementation notes, test evidence, updated documentation, review findings, and release or runbook notes.

## Quality Gates
- Code review, automated tests, dependency checks, observability readiness, rollback plan, and stakeholder acceptance for user-facing changes.

## References
- .ai/checklists
- .ai/templates
- .cursor/rules/testing.md
- docs/development-workflow.md
