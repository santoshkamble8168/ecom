# Generate Release Notes Prompt

## Purpose
Reusable prompt for Generate Release Notes work in an AI-assisted engineering workflow.

## Responsibilities
- Guide AI from context gathering to final review.
- Standardize expected inputs and outputs.
- Ensure planning, testing, security, and documentation are included.

## Best Practices
- Paste specific requirements and acceptance criteria.
- Reference relevant files, tickets, designs, incidents, or APIs.
- Ask for assumptions, risks, and verification evidence.
- Require output to match project conventions.

## Checklist
- [ ] Context is included.
- [ ] Scope and constraints are clear.
- [ ] Acceptance criteria are explicit.
- [ ] Quality gates are requested.
- [ ] Review and documentation are requested.

## Examples
- Build a feature from user story, update API docs, add tests, and provide self-review.
- Review PR for regressions, security issues, missing tests, and operational risk.

## Common Mistakes
- Requesting code without requirements.
- Omitting test expectations.
- Asking for broad rewrites without constraints.
- Accepting generated output without review.

## Production-Ready Prompt
Act as the appropriate specialist agents for **Generate Release Notes**. Read `.ai/memory/project-memory.md`, `.ai/context/*`, relevant `.cursor/rules/*`, and existing docs before producing output.

Return:
- Context summary and assumptions.
- Step-by-step plan.
- Proposed files or artifacts to change.
- Acceptance criteria and quality gates.
- Tests, security checks, performance checks, and documentation updates.
- Self-review notes and residual risks.

Constraints:
- Do not generate placeholder code.
- Do not skip tests for critical paths.
- Prefer existing project patterns and small, reviewable changes.

## References
- .ai/agents
- .ai/workflows
- .ai/checklists
- .cursor/rules/global.md
