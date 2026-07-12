# Sprint 0 - Project Foundation

Theme: Monorepo, CI/CD, Docker, design system, authentication skeleton  
Primary source volumes: Volume 2, Volume 6, Volume 7, Volume 10, Volume 11, Volume 12  
Status: Done — see `docs/sprints/sprint-00-project-foundation-summary.md`

## Sprint Goal

Create the production-grade platform foundation required for every later commerce feature. This sprint establishes the monorepo, local development environment, shared packages, CI gates, Docker services, baseline observability, design-system foundations, API standards, and an authentication skeleton without completing customer-facing auth flows.

## Business Outcome

The team can start feature development with consistent architecture, reusable UI, strict typing, repeatable local setup, automated quality checks, and a clear path for storefront, admin, API, worker, database, cache, search, storage, and documentation.

## Scope

- Initialize monorepo layout for `apps/storefront`, `apps/admin`, `apps/api`, `apps/worker`, shared packages, infrastructure, scripts, and documentation.
- Configure strict TypeScript, ESLint, Prettier, shared tsconfig, workspace package strategy, and import conventions.
- Prepare Docker Compose services for PostgreSQL, Redis, Meilisearch, MinIO, Mailpit, API, worker, storefront, admin, and Nginx.
- Establish CI pipeline stages: install, type check, lint, unit test, build, integration test placeholder, security scan placeholder, Docker build placeholder.
- Create shared design-token plan for color, spacing, radius, typography, motion, breakpoints, z-index, and dark mode.
- Create shadcn/ui and Tailwind architecture plan for shared UI package.
- Prepare API standards: `/api/v1`, response envelope, error envelope, request ID, OpenAPI generation, Swagger access, health endpoints.
- Prepare authentication skeleton for OTP, Google OAuth, JWT access tokens, refresh tokens, session model, guards, decorators, and RBAC primitives.
- Establish logging, configuration validation, environment variable strategy, correlation IDs, and error handling standards.

## Deliverables

### Frontend

- Storefront and admin app shell plans using Next.js App Router.
- Shared UI package structure for primitives, commerce components, admin components, layout components, and design tokens.
- Global layout requirements for announcement bar, header, navigation, content, newsletter, and footer.
- Theme provider plan for light, dark, and system modes.
- Loading, error, not-found, and empty-state conventions for every route.
- Storybook setup plan covering foundations, primitives, commerce, admin, and templates.

### Backend

- NestJS modular monolith foundation plan with API, application, domain, and infrastructure layers.
- Cross-cutting modules for config, logger, auth, cache, queue, events, audit, health, and OpenAPI.
- Authentication skeleton with no production shortcuts: OTP challenge model, refresh-token model, OAuth account model, guards, RBAC metadata, and secure-cookie strategy.
- Standard exception filters, validation pipes, request ID middleware, and structured logs.

### Database

- Prisma setup plan for PostgreSQL with domain-aligned schema organization.
- Initial identity, platform, and audit table planning.
- Migration strategy: forward-only migrations, reviewed schema changes, seed data, migration tests, and rollback playbooks.
- Seed data plan for roles, permissions, feature flags, settings, and development admin user.

### API

- Health endpoints: `/health`, `/health/live`, `/health/ready`.
- Auth skeleton endpoints planned under `/api/v1/auth`.
- OpenAPI baseline for success envelope, error envelope, auth headers, pagination metadata, and common DTOs.

### DevOps

- Docker Compose service topology for all local dependencies.
- `.env.example` planning for database, Redis, Meilisearch, MinIO, JWT, OAuth, SMTP, API URL, storefront URL, admin URL, logging, and feature flags.
- Nginx routing plan for storefront, admin, API, static assets, compression, security headers, and rate limits.
- GitHub Actions quality gates and protected-branch expectations.

### QA

- Unit test setup for shared utilities, backend config validation, auth primitives, and UI primitives.
- Integration test setup plan for API health, database connection, Redis connection, and OpenAPI generation.
- Playwright smoke test plan for storefront shell, admin shell, dark mode, and accessibility baseline.
- Accessibility checks for focus rings, keyboard navigation, semantic layout, contrast tokens, and reduced motion.
- Performance budget baseline: Lighthouse >= 95 target, LCP < 2.5s, INP < 200ms, CLS < 0.1.

### Documentation

- Root README setup instructions.
- Architecture decision records for modular monolith, Next.js, NestJS, PostgreSQL, Redis, Meilisearch, MinIO, and Tailwind/shadcn.
- Local development runbook.
- API standards document.
- Design-system governance document.
- Sprint summary template.

## Planned Folder Structure

```text
apps/
  storefront/
  admin/
  api/
  worker/
packages/
  ui/
  types/
  validation/
  config/
  logger/
  auth/
  analytics/
  shared/
  eslint/
  tsconfig/
infrastructure/
  docker/
  nginx/
docs/
documents/
  sprint-planning/
scripts/
```

## Acceptance Criteria

- A new developer can run the platform locally from documented commands.
- All apps and packages follow strict TypeScript and shared linting rules.
- CI blocks merge on type, lint, test, and build failures.
- Docker Compose includes all required platform dependencies.
- API health and OpenAPI baselines are planned and documented.
- Design tokens and Storybook foundations are ready for Sprint 1 and Sprint 3 UI work.
- Auth skeleton supports later OTP, Google, JWT, refresh token, and RBAC implementation.

## Risks

- Overbuilding infrastructure before domain features may slow delivery.
- Under-specifying design tokens will create UI drift later.
- Weak CI foundations will let architectural violations enter early.

## Pending Decisions

- ~~Final package manager and build orchestrator selection.~~ Resolved:
  pnpm workspaces + Turborepo (see `docs/decisions/decision-log.md`).
- Exact secret management approach for production — deferred to
  Sprint 17 (Production Readiness); local dev uses `.env` files
  (gitignored) as documented in
  `docs/security/sprint-00-security-review.md`.
- ~~Whether admin and storefront deploy as separate Next.js services
  from day one.~~ Resolved: yes, two independent apps — see
  `docs/decisions/0002-nextjs-app-router-for-frontends.md`.
