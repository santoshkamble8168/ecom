# Sprint 15 Summary — Performance & SEO

Status: **Done**
Plan: `documents/sprint-planning/sprint-15-performance-seo.md`
Related: [ADR 0015](../decisions/0015-seo-and-cache.md),
[SEO checklist](../seo/checklist.md),
[Performance budget](../performance/budget.md),
[Cache strategy](../performance/cache-strategy.md),
[Accessibility conformance](../security/sprint-15-accessibility-conformance.md)

## Outcome

Indexable storefront routes have metadata, canonicals, and JSON-LD.
Robots/sitemap exist on both Next and Nest. Public catalog GETs send
short shared `Cache-Control`; private routes do not. Accessibility
fixes: skip link, search/cart labels, reduced motion. Lighthouse CI
and strict CSP are documented exceptions.

## What Was Built

### Frontend

- `metadataBase`, Open Graph, canonicals on PLP/PDP/CMS/blog/search.
- `noindex` layouts for cart, checkout, account, wishlist, order.
- JSON-LD: Organization, WebSite SearchAction, Product, BreadcrumbList,
  Article, FAQPage.
- `app/robots.ts`, `app/sitemap.ts` (plus CMS FAQ/privacy URLs).
- Next Image AVIF/WebP; long-cache headers for `/_next/static`.
- Skip link, search `aria-label`, cart count in accessible name,
  reduced-motion CSS.

### Backend

- `GET /robots.txt` and `GET /sitemap.xml` on the API host (not under
  `api/v1`). Built from published products/categories/collections/pages/
  posts.
- `CacheControlInterceptor` using `cacheControlForRequest`.
- Prisma query events log SQL slower than 200ms.

### DevOps

- Nginx: gzip XML, immutable `/_next/static/`, Permissions-Policy,
  admin `no-store`.

### QA

- Unit: `@ecom/shared` seo helpers; `SeoService` sitemap/robots.
- E2E: `playwright/tests/storefront-seo.spec.ts`.

## Pending / debt

- Lighthouse CI (needs a stable preview URL).
- Strict Content-Security-Policy (payment SDK + image CDN).
- On-demand sitemap revalidation on CMS publish.
- Full screen-reader pass (Sprint 17).
- `next/image` conversion of remaining raw `<img>` tags.

## Definition of Done

- [x] Indexable pages have metadata, canonical, sitemap coverage
- [x] JSON-LD for org, search, product, article, FAQ
- [x] Cache policy documented and applied
- [x] Accessibility residuals logged
- [x] ADR 0015 and sprint docs
