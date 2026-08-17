# Feature Flag Governance

See [ADR 0012](../decisions/0012-admin-operations-control-center.md).
Admin: `/feature-flags`. API: `GET /admin/feature-flags`
(`feature_flag:read`), `PATCH /admin/feature-flags/:key`
(`feature_flag:write`).

## Evaluation

A flag is on only when **all** of these hold:

1. `isEnabled` is true.
2. `environment` is `all`, **or** it equals `NODE_ENV`
   (`development` \| `test` \| `production`).
3. `rolloutPercent >= 100`. Values `0–99` stay off. This is a
   binary env-wide gate, **not** a random or per-user bucket.

There is **no per-user sticky bucket** and no partial traffic split.
Use `isEnabled` + `environment` for launches. Leave `rolloutPercent`
at 100 when enabled, 0 when parked.

Results are cached in Redis for `FEATURE_FLAG_CACHE_TTL_SECONDS`
(default 30). After a PATCH, callers can see the old value until TTL
expiry (and on cache miss, every process hits Postgres — no
singleflight lock).

## Who can change flags

| Role | Access |
| --- | --- |
| `admin` | read + write |
| others | none unless granted `feature_flag:*` |

Seeded `analyst` / `finance` / support / catalog roles do **not**
include flag write. PATCH is audited (`feature_flag.updated`) with
`before`/`after`.

## Seeded flags

| Key | Default | Notes |
| --- | --- | --- |
| `search.meilisearch` | off, `all`, 100% | Meilisearch-backed search |
| `payments.razorpay` | on, `all`, 100% | Razorpay checkout (mock locally) |
| `checkout.new_flow` | off, `development`, 0% | Redesigned checkout — keep off in production |
| `recommendations.ai` | off, `all`, 0% | Sprint 16 placeholder |
| `wallet.enabled` | off, `all`, 0% | Wallet tender — keep off |
| `referral.program` | off, `all`, 0% | Referral program placeholder |

Do not enable `wallet.enabled` or `checkout.new_flow` in production
without a dedicated review. `payments.razorpay` on in mock mode is
expected for local checkout.

## Change process

1. Confirm environment: a `production` flag never evaluates in
   `development`, and vice versa; `all` evaluates everywhere.
2. Prefer `isEnabled` over percent for binary launches.
3. PATCH `isEnabled` / `environment` / `rolloutPercent` (0–100).
4. Wait at least one cache TTL, then verify on a storefront request.
5. Check `/audit-logs` for `feature_flag.updated`.

Not built: sticky per-user rollout, flag dependencies, or scheduled
flag changes.
