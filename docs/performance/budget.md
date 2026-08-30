# Performance Budget

Related: [ADR 0015](../decisions/0015-seo-and-cache.md),
[cache strategy](./cache-strategy.md)

Targets for a mid-range mobile profile on the homepage and PDP. These
are **budgets**, not CI gates (no Lighthouse job this sprint).

| Metric | Budget | Notes |
| --- | --- | --- |
| LCP | ≤ 2.5s | Hero/PDP image should be the LCP candidate; AVIF/WebP via Next `images.formats`. |
| INP | ≤ 200ms | Filter and cart clicks; reduced-motion short-circuits animations. |
| CLS | ≤ 0.1 | Reserve image aspect boxes already used on PLP/PDP. |
| Route JS (gzip) | ≤ 250 KB first load | Next App Router; revisit with `@next/bundle-analyzer` if exceeded. |
| API catalog GET | p95 < 300ms | Slow SQL (≥ 200ms) is logged from Prisma query events. |
| Search (Meilisearch) | p95 < 200ms | Postgres fallback is slower; documented on PLP `searchEngine` meta. |

Exceptions: admin tables and Storybook are out of storefront CWV scope.
Checkout is noindex and not in the LCP budget.
