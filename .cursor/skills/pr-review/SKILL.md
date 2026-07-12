---
name: pr-review
description: Reviews pull requests and code changes for correctness, security, performance, accessibility, tests, and maintainability. Use when the user asks for a PR review, code review, review my changes, or review before merge.
---

# PR Review

## When To Use

Use when reviewing:
- A GitHub PR (`gh pr view`, URL, or branch diff)
- Local uncommitted or branch changes before opening a PR
- A specific file or patch the user pasted

## Instructions

### 1. Gather evidence

Run as needed:

```bash
git status
git diff
git diff main...HEAD
gh pr view <number> --json title,body,files,commits
gh pr diff <number>
```

Read when relevant:
- `.ai/memory/project-memory.md`
- `.cursor/rules/global.md`, `security.md`, `testing.md`, `api.md`
- `.ai/checklists/code-review.md`
- Requirement or sprint docs linked in the PR

### 2. Review dimensions

Check each area and cite file/line when possible:

| Area | Look for |
|------|----------|
| Correctness | Logic bugs, edge cases, race conditions, null/error paths |
| Requirements | Acceptance criteria met; scope creep or missing behavior |
| Architecture | Layer boundaries, coupling, duplication, SOLID |
| Security | AuthZ, input validation, secrets, injection, unsafe defaults |
| Performance | N+1 queries, unnecessary renders, missing pagination/caching |
| Accessibility | Labels, keyboard nav, contrast, semantic HTML |
| Tests | Missing unit/integration/E2E for risky paths |
| Ops | Migrations, env vars, logging, monitoring, rollback |
| Docs | README, API docs, ADRs, release notes updated |

### 3. Severity model

- **Blocker** — must fix before merge (security, data loss, broken core flow)
- **Major** — should fix before merge (missing tests, clear bug risk)
- **Minor** — nice to fix (naming, small refactor)
- **Nit** — optional style preference

### 4. Output format

```markdown
## Review Summary
One paragraph: merge recommendation and overall risk.

## Findings
### Blockers
- [file:line] Issue — why it matters — suggested fix

### Major
- ...

### Minor / Nits
- ...

## What Looks Good
- Specific positives (tests, clear boundaries, good naming).

## Test Gaps
- Missing cases and suggested tests.

## Merge Checklist
- [ ] Requirements met
- [ ] Tests adequate
- [ ] Security reviewed
- [ ] Docs updated
- [ ] Rollback considered
```

## Rules

- Be specific; avoid generic advice without evidence.
- Prefer suggesting a fix over only criticizing.
- Do not approve if blockers exist unless user asked for informational review only.
- Distinguish confirmed issues from assumptions.

## References

- `.ai/checklists/code-review.md`
- `.ai/checklists/security-review.md`
- `.ai/prompts/review-pr.md`
- `.cursor/rules/code-review.md`
- `.cursor/rules/pull-request.md`
