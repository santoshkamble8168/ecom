# Sprint 12 Security Review — Admin Operations

Status: Complete
Reviewed: Sprint 12 (admin dashboard, customers, audit, feature flags,
settings, reports/exports)
Scope: `apps/api/src/{dashboard,customers,platform,reports}`,
`apps/api/src/audit`, worker `admin-jobs`, admin routes `/`,
`/customers`, `/audit-logs`, `/feature-flags`, `/settings`,
`/reports`, env keys in `packages/config`

## Summary

This sprint puts customer PII, audit history, kill-switch flags, and
CSV dumps behind JWT + new permission keys. No impersonation API
exists. Findings below are accepted risks with owners — this review
did not change application code.

## Findings Logged As Accepted Risk

| # | Finding | Severity | Rationale / Plan |
| --- | --- | --- | --- |
| 1 | Customer list/detail returns email, phone, addresses, orders, returns, reviews, loyalty, notes. `analyst` has `customer:read`. Support notes are visible to every `customer:read` actor, not just the author. | Medium (privacy) | Expected for an ops console. Restrict `analyst` if that role should be metrics-only. Do not log full detail payloads. Notes are append-only (no edit/delete API). |
| 2 | `GET /admin/audit-logs/export` streams CSV of matching rows, including `before`/`after`/metadata that can hold PII and secrets-shaped JSON from older writers. `audit:export` is separate from `audit:read`; `analyst` cannot export. | Medium | Keep `audit:export` admin-only in seed. Treat CSV as a regulated download. Retention delete (`AUDIT_RETENTION_DAYS`, default 365) is the backstop — there is no cold archive. |
| 3 | Feature-flag Redis cache (`FEATURE_FLAG_CACHE_TTL_SECONDS`, default 30) has no lock. TTL expiry can stampede Postgres. After PATCH, evaluation can stay stale for one TTL. `rolloutPercent < 100` is treated as off (not a traffic split). | Low | Fine at current admin/storefront volume. Do not percent-roll checkout/payments. See [ADR 0012](../decisions/0012-admin-operations-control-center.md). |
| 4 | `PATCH /admin/settings` DTO is an object; safety is the **service allowlist** of seeded keys (`store.*`, `seo.defaultTitle`, `notifications.emailEnabled`). A missed allowlist check would persist arbitrary JSON. | Medium if allowlist regresses | Reject unknown keys. `store.maintenanceMode` is a kill switch — `settings:write` is admin-only in seed. |
| 5 | Report CSVs land on local disk (`EXPORT_STORAGE_PATH`, default `./tmp/exports`), not MinIO. `ExportJobSummary.filePath` can leak a server path. Files may include order/customer columns. Default retention 14 days. | Medium in prod if the path is web-reachable | Keep the directory off the public root and out of container image layers that get published. Prefer object storage (Sprint 17 / MinIO) before production load. |
| 6 | New permissions (`dashboard:*` through `report:export`) and roles `analyst` / `finance` are seed-defined. `PermissionsGuard` ORs required keys (any one suffices). Routes without `@Permissions` still pass the guard. | Low | Sprint 12 admin controllers declare permissions. Do not add new `/admin/*` handlers without `@Permissions`. Revisit OR vs AND if a route ever lists multiple keys meaning “all of”. |
| 7 | Suspend (`PATCH .../status`) does not revoke access or refresh tokens. `JwtStrategy.validate` does not load `User.status`. A suspended shopper keeps access until JWT expiry (15m) and can refresh (30d) unless a later check is added. | Medium | Documented operator limitation. Follow-up: reject refresh/login when `status !== active`, and optionally revoke refresh rows on suspend. |
| 8 | No impersonation, account merge, or “login as customer”. Support cannot mint a shopper session. | n/a (strength) | Keep it that way until there is an audited, time-boxed impersonation design. |
| 9 | Dashboard cache (`DASHBOARD_CACHE_TTL_SECONDS`, default 60) can hide a fraud/spike for a minute. Live SQL over `orders` / `checkout_sessions` / `audit_logs` will get expensive before Sprint 14. | Low | Operational freshness vs load; not a confidentiality issue. |
| 10 | Admin dashboard/customer/audit/flag/settings/report controllers are not `@SkipThrottle()` (unlike catalog/checkout). Authenticated staff share the global 60 req/min/IP limit. | Low | Prefer this over skipping. Raise only if the admin UI polls exports too aggressively. |

## Strengths Confirmed

- Global `JwtAuthGuard` + `PermissionsGuard`; Sprint 12 admin routes
  declare explicit permission strings from `PERMISSIONS`.
- `customer:write` is only notes + status — no impersonate, no
  password reset, no email change from this API.
- Audit export is its own permission, not bundled with `audit:read`.
- Flag `environment` prevents a `development`-scoped flag from
  evaluating in `production`.
- Settings writes are intended as an allowlist, not a generic KV dump.
- Report `POST` does not block on CSV generation.
- `requestId` is generated if the client omits `x-request-id`, and is
  echoed on every envelope — usable as a correlation ID.
- Seeded `finance` cannot read customers; seeded `analyst` cannot
  export audit CSV.

## PII / export handling

- Customer PII lives in admin JSON and in some report CSVs (sales
  lines, retention). Download is `report:export` or `audit:export`.
- Export files are worker-local; delete with job expiry. Do not
  commit `./tmp/exports`.
- Audit CSV is the highest-sensitivity export this sprint.

## Follow-up

- [ ] Check `User.status` on JWT validate and refresh (finding #7).
- [ ] Move export files to MinIO with signed download URLs (finding #5).
- [ ] Confirm settings allowlist is enforced in `SettingsService.patch`
      with unit tests (finding #4).
