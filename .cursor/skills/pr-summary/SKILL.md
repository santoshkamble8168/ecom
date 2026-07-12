---
name: pr-summary
description: Generates clear pull request summaries from git diffs, commits, and changed files. Use when the user asks for a PR summary, PR description draft, change summary, or what changed before opening a pull request.
---

# PR Summary

## When To Use

Use when the user wants a summary of local or branch changes before creating or updating a PR.

## Instructions

1. Inspect the change set before writing:
   - `git status`
   - `git diff` (staged and unstaged)
   - `git log` (recent commit style)
   - `git diff <base-branch>...HEAD` when summarizing a branch
2. Read project context when available:
   - `.ai/memory/project-memory.md`
   - `.github/PULL_REQUEST_TEMPLATE.md`
   - Related ticket, sprint doc, or requirement file if mentioned
3. Summarize by **outcome**, not file list only.
4. Group changes into themes: feature, bug fix, refactor, tests, docs, infra.
5. Call out risks: migrations, breaking changes, env vars, feature flags, rollback.
6. Include test evidence and manual verification steps when known.
7. Do not invent changes, tests, or ticket links.

## Output Format

```markdown
## Summary
- 1-3 bullets explaining why this change exists and what it enables.

## Changes
- Grouped bullets by area (API, UI, DB, tests, docs, CI).

## Test Plan
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E / manual checks
- Notes on what was run or still needed.

## Risks And Rollback
- Migrations, config changes, compatibility notes, rollback steps.

## Linked Work
- Closes #123 / ADR / sprint reference (only if provided or found).
```

## Quality Bar

- Lead with user or system impact.
- Mention only files or modules that matter to reviewers.
- Flag missing tests, docs, or operational steps explicitly.
- Keep it review-ready: concise, factual, actionable.

## References

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.ai/templates/pull-request.md`
- `.cursor/rules/pull-request.md`
