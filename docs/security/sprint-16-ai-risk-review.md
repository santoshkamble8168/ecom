# Sprint 16 AI risk review

Status: Complete
Reviewed: Sprint 16 (recommendations, flags, personalization, semantic hook)
Related: [ADR 0016](../decisions/0016-rule-based-recommendations.md),
[personalization privacy](../ai/personalization-privacy.md)

## Summary

Shopping does not depend on a model. Flags default off for AI and
semantic search. Personalization stores catalog slugs only.

## Findings logged as accepted risk

| # | Finding | Severity | Rationale / Plan |
| --- | --- | --- | --- |
| 1 | Public `GET /recommendations/:slot` can be scraped. | Low | Same as catalog GETs. `@SkipThrottle()`. Redis TTL cache. |
| 2 | Frequently-bought scans 200 recent paid orders in the API process. | Medium at volume | Heuristic MVP. Materialize a co-occurrence table if latency grows. |
| 3 | `recommendations.ai` can be enabled with no ranking change. | Low | Reason string states the provider is unwired. Documented. |
| 4 | Semantic mode is a no-op for retrieval. | n/a (product) | Prevents shipping a fake "AI search". |
| 5 | Recommendation rails use full-page `<a>` navigation. | Low | Avoids nesting Next `Link` inside the shared rail. |
| 6 | Guest recently-viewed is session-scoped, not a profile. | n/a (privacy) | Intentional. |

## Strengths confirmed

- Core checkout works with AI flags off.
- Fallback merchandising slugs are admin-editable.
- Analytics taxonomy extended rather than a parallel event store.
