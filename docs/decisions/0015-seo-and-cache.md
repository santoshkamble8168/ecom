# ADR 0015: Storefront SEO Surface and Shared Cache

- Status: Accepted
- Date: 2026-08-30
- Sprint: Sprint 15 — Performance & SEO

## Context

Crawlers hit the storefront host, not Nest. A warehouse, Lighthouse CI
against every PR, and a tailored CSP need production origins we do not
have yet. Shared caches must never store cart, auth, or admin JSON.

## Decision

**1. Dual robots/sitemap.** Next.js `app/robots.ts` and `app/sitemap.ts`
are what Google sees on `:3000`. Nest also serves `/robots.txt` and
`/sitemap.xml` (excluded from `api/v1`) for operators hitting the API
origin. Bodies share `buildRobotsTxt` in `@ecom/shared`.

**2. JSON-LD is first-party, not a tag manager.** Organization +
WebSite SearchAction on the root layout; Product + BreadcrumbList on
PDP; Article on blog posts; FAQPage on CMS FAQ templates.

**3. Cache-Control from the API, not a CDN config table.**
`cacheControlForRequest` sets `public, s-maxage=60` on catalog/CMS GETs
and `private, no-store` on everything else. Nginx adds long-cache only
for `/_next/static/`.

**4. No Lighthouse CI gate this sprint.** Playwright axe already runs
on storefront/admin shells. Lighthouse numbers are a documented budget
with exceptions, not a red CI job, until a production-like preview
environment exists.

**5. CSP stays Helmet defaults.** A strict CSP is deferred until
payment SDK and image CDN origins are final (same finding as Sprint 0).

## Consequences

- Indexable routes must set `generateMetadata` / `alternates.canonical`.
- Changing `ROBOTS_DISALLOW` updates both Next and Nest robots output
  after a shared package rebuild.
- Stale catalog JSON for up to 60s at the edge is accepted.

## Revisit Triggers

- Lighthouse CI in preview deploys.
- Strict CSP when Razorpay checkout.js and a real image CDN are live.
- ISR on-demand revalidation when CMS publish should bust sitemap
  immediately.
