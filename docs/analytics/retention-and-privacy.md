# Analytics Retention and Privacy

Related: [ADR 0014](../decisions/0014-analytics-ingest-and-retention.md),
[data-quality review](../security/sprint-14-analytics-data-quality-review.md)

## Retention

- Raw `analytics_events`: `ANALYTICS_RETENTION_DAYS` (default **90**).
  Worker cron `EVERY_DAY_AT_3AM` deletes `occurredAt < now − N days`.
- Daily aggregates (`analytics_daily_aggregates`) are **not** purged
  this sprint (small rows; revisit with warehouse).
- Search KPIs still read `search_logs` (Sprint 4 table; not bound to
  this retention flag).

## Sampling

Client ingest only: `ANALYTICS_SAMPLE_RATE` 0–1 (default 1).
Deterministic hash of `sessionId` so a session is all-in or all-out.
Server `trackServer` is not sampled.

## Disable

`ANALYTICS_ENABLED=false` accepts the HTTP call but skips writes
(`skipped` count). Commerce hooks still fire-and-forget.

## PII

Properties are sanitized before insert: email, phone, password, token,
secret, authorization, otp/code, card, cvv, pan keys are dropped.
Non-scalars are dropped. Strings truncated to 200 chars; max 20 keys.

Do not put payment PAN, OTP, or passwords in `properties`. Session ids
are opaque UUIDs, not emails.
