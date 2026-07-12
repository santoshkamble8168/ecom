# ADR 0002: Next.js 15 App Router for Storefront and Admin

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

Two customer-facing frontends are required: `apps/storefront` (public
shopping experience — SEO-critical, high traffic, needs good Core Web
Vitals) and `apps/admin` (internal dashboard — auth-gated, data-dense,
SEO irrelevant). Sprint 0's Pending Decisions explicitly flag "whether
admin and storefront deploy as separate Next.js services from day one."
The Sprint 15 plan (`documents/sprint-planning/sprint-15-performance-seo.md`)
sets a hard performance budget (Lighthouse ≥ 95, LCP < 2.5s, INP < 200ms,
CLS < 0.1) that the framework choice must be able to hit.

## Decision

Use **Next.js 15 with the App Router** as two independent applications,
`apps/storefront` and `apps/admin`, each with its own `package.json`,
Dockerfile, and Nginx upstream (see `infrastructure/nginx/nginx.conf`),
rather than one app with route-based sections or a single shared Next.js
instance. Both consume the shared `@ecom/ui` design-system package for
primitives, layout components, and design tokens so visual consistency
doesn't depend on code sharing at the app level.

Rationale for Next.js specifically over a plain React SPA or another
meta-framework:

- Server Components + streaming give the storefront fast first paint and
  small client bundles for SEO-critical, high-traffic pages (home, PLP,
  PDP) without hand-rolling SSR.
- File-system routing with route groups/layouts maps directly onto the
  "loading, error, not-found, and empty-state conventions for every
  route" requirement in the Sprint 0 deliverables.
- Built-in image optimization, metadata API, and route-level caching
  controls directly support the Sprint 15 performance budget.
- One React-based framework for both frontends means one hiring profile,
  one shared ESLint/TS config (`@ecom/eslint-config`, `@ecom/tsconfig`),
  and one shared UI package — reducing duplicated tooling.

Rationale for **two separate apps** instead of one:

- Admin is entirely behind authentication and has no SEO requirement, so
  it doesn't need the SSR/streaming investment the storefront needs; a
  simpler mostly-client-rendered dashboard is fine.
- Independent deploys mean an admin release never risks storefront
  uptime (and vice versa) and each can scale independently (admin has
  low, internal traffic; storefront has public, spiky traffic).
- Nginx already routes them as separate upstreams
  (`infrastructure/nginx/nginx.conf`), so this matches the deployed
  topology rather than fighting it with one process serving two audiences.

## Alternatives Considered

- **Single Next.js app with `/admin` and storefront routes side by
  side** — rejected: couples deploy cadence and blast radius of two
  very different audiences, and complicates auth middleware (would need
  to carefully scope session/cookie logic per route group instead of per
  app).
- **Remix or plain Vite + React Router SPA** — rejected: would require
  building SSR/streaming and image optimization by hand to hit the same
  performance budget, with no meaningful benefit over Next.js for this
  team's needs; Next.js has the larger ecosystem and hiring pool.
- **Server-rendered admin in the same framework as API (e.g. NestJS
  server-rendered views)** — rejected: loses component reuse with
  `@ecom/ui` and modern DX (hooks, client interactivity) that a dense
  admin dashboard needs (tables, filters, modals).

## Consequences

- Positive: storefront can be tuned purely for public performance/SEO;
  admin can be tuned purely for internal data-density/DX, without
  compromise.
- Positive: `@ecom/ui` becomes the single place visual consistency is
  enforced, verified independently via Storybook + accessibility addon,
  decoupled from either app's routing.
- Negative: two Next.js apps mean two build/deploy pipelines, two
  Dockerfiles, and duplicated boilerplate (theme provider, error
  boundaries) that must be kept in sync — mitigated by pushing shared
  logic into `packages/ui` and `packages/shared` rather than duplicating
  it inline in each app.
- Negative: any cross-app navigation (e.g. admin linking to a live
  storefront product page) is a full page navigation across origins/
  ports, not a client-side route change — acceptable given how rarely
  that happens.

## Revisit Triggers

- If admin ever needs public-facing, SEO-relevant pages (unlikely per
  current scope).
- If build/deploy overhead of maintaining two apps becomes a measurable
  velocity drag, consider a shared Next.js "multi-zone" setup instead of
  a full merge.
