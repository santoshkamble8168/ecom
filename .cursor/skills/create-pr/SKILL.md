---
name: create-pr
description: Creates GitHub pull requests from the current branch using gh, including branch analysis, push, title, and PR body. Use when the user asks to create a PR, open a pull request, or submit changes for review.
---

# Create PR

## When To Use

Use when the user explicitly asks to create or open a pull request.

## Prerequisites

- Changes are committed (or user explicitly wants PR from current branch state).
- `gh` CLI is authenticated.
- Do not commit unless the user asked.

## Instructions

### 1. Understand the branch

Run in parallel:

```bash
git status
git diff
git log --oneline -10
git branch -vv
```

Then inspect full branch history vs base (default `main` unless user specifies otherwise):

```bash
git log main..HEAD --oneline
git diff main...HEAD
```

### 2. Draft PR content

Use the **pr-summary** skill output shape or `.github/PULL_REQUEST_TEMPLATE.md`.

PR title:
- 1 concise line focused on outcome
- Use repo commit style from `git log`

PR body must include:
- Summary (why + what)
- Test plan with evidence
- Risks / rollback for migrations or infra
- Linked issues only when known

### 3. Push branch if needed

```bash
git push -u origin HEAD
```

Only push when required and user asked to create the PR.

### 4. Create PR with gh

```bash
gh pr create --title "PR title" --body "$(cat <<'EOF'
## Summary
...

## Test plan
- [ ] ...

EOF
)"
```

Return the PR URL to the user.

## Rules

- Never update git config.
- Never force-push to `main` / `master`.
- Do not commit secrets or `.env` files.
- Analyze **all commits** on the branch, not only the latest.
- Warn if branch is behind base or has merge conflicts.

## If Blocked

- No commits: ask user to commit first or confirm empty PR intent.
- No remote / auth failure: report exact error and next step.
- Uncommitted changes: summarize them and ask whether to commit before PR.

## References

- `.cursor/skills/pr-summary/SKILL.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.ai/workflows/pull-request.md`
- `.cursor/rules/pull-request.md`
- `.cursor/rules/git-workflow.md`
