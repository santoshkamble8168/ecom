# ecom

## Purpose
Production-grade commerce platform monorepo (storefront, admin, API, worker) plus a reusable AI Engineering Framework for planning, implementation, testing, review, deployment, and release.

## Platform Status
Sprint 0 (Project Foundation) is scaffolded: monorepo, shared packages, Next.js storefront and admin shells, a NestJS API with an auth skeleton, a NestJS worker, Prisma schema for identity/platform/audit, Docker Compose for all local dependencies, and CI. See `documents/sprint-planning/README.md` for the full sprint tracker.

## Monorepo Layout

```text
apps/
  storefront/   Next.js customer-facing storefront (port 3000)
  admin/        Next.js admin dashboard (port 3001)
  api/          NestJS modular monolith API (port 4000)
  worker/       NestJS background job processor (BullMQ)
packages/
  ui/           Design tokens, Tailwind preset, shared components
  types/        Shared TypeScript contracts
  validation/   Shared Zod schemas
  config/       Environment validation
  logger/       Structured pino logger
  shared/       Response envelopes, error classes, pagination helpers
  tsconfig/     Shared TypeScript base configs
  eslint-config/  Shared ESLint configs
infrastructure/
  docker/       Docker Compose stack for local dependencies
  nginx/        Reverse proxy config
docs/           Durable engineering documentation
documents/      Sprint planning tracker and per-sprint plans
requirement-documents/  Source-of-truth requirements, architecture volumes, and design screenshots
scripts/        AI framework generation/validation scripts
```

## Prerequisites
- Node.js 22+ (`.nvmrc` pins the version)
- pnpm 9+ (`corepack enable` will provide it automatically)
- Docker Desktop (for Postgres, Redis, Meilisearch, MinIO, Mailpit, Nginx)

## Local Development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment files:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/storefront/.env.example apps/storefront/.env
   cp apps/admin/.env.example apps/admin/.env
   cp infrastructure/docker/.env.example infrastructure/docker/.env
   ```

3. Start local infrastructure (Postgres, Redis, Meilisearch, MinIO, Mailpit):

   ```bash
   pnpm docker:up
   ```

4. Generate the Prisma client and run migrations:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

5. Run everything in dev mode:

   ```bash
   pnpm dev
   ```

   - Storefront: http://localhost:3000
   - Admin: http://localhost:3001
   - API: http://localhost:4000/api/v1 (Swagger at `/api/v1/docs`)
   - API health: http://localhost:4000/health, `/health/live`, `/health/ready`
   - Mailpit UI (captured emails): http://localhost:8025
   - MinIO console: http://localhost:9001

## Quality Gates

```bash
pnpm typecheck   # strict TypeScript across every app/package
pnpm lint        # shared ESLint rules
pnpm test        # unit tests
pnpm build       # production builds
```

CI (`.github/workflows/ci.yml`) runs install, typecheck, lint, test, and build on every pull request.

### Windows + OneDrive build failures

If `pnpm build` fails with `EPERM: operation not permitted, open '.next/trace'`,
OneDrive is locking the Next.js output while two apps build in parallel. Fixes,
in order of preference:

1. **Move the repo outside OneDrive** (recommended), e.g. `C:\dev\ecom`.
2. **Keep using this repo path** — Turborepo now builds `@ecom/storefront`
   before `@ecom/admin` to avoid parallel `.next` writes. Re-run `pnpm build`.
3. **Still failing?** Point build output outside sync:
   ```powershell
   $env:NEXT_DIST_DIR="C:\temp\ecom-storefront-next"
   pnpm --filter @ecom/storefront build
   $env:NEXT_DIST_DIR="C:\temp\ecom-admin-next"
   pnpm --filter @ecom/admin build
   ```
   (Requires `distDir` support in each app's `next.config.mjs` — see below if needed.)
4. **Build inside Docker** — unaffected by OneDrive:
   `docker compose -f infrastructure/docker/docker-compose.yml build storefront admin`

## Responsibilities
- Keep `.ai/` as reusable AI operating knowledge: agents, prompts, workflows, checklists, templates, context, memory, and skills.
- Keep `.cursor/` as Cursor-specific rules, prompts, skills, agents, and workflows.
- Keep `docs/` as the durable engineering source of truth.
- Keep `tests/` and `playwright/` ready for automated quality gates.

## Best Practices
- Read `.ai/memory/project-memory.md` and relevant docs before coding.
- Plan before implementation and document architectural decisions.
- Follow Clean Architecture, SOLID, DRY, KISS, YAGNI, secure defaults, accessibility, performance, and test-first delivery.
- Update docs and tests in the same change as behavior updates.

## Checklist
- [ ] Requirements are understood.
- [ ] Plan and acceptance criteria are documented.
- [ ] Code follows project rules.
- [ ] Tests and docs are updated.
- [ ] Security, performance, accessibility, and operations are reviewed.

## Examples
- Start a feature from `.ai/prompts/build-feature.md`.
- Review a PR with `.ai/checklists/code-review.md` and `.github/PULL_REQUEST_TEMPLATE.md`.
- Plan a release with `.ai/workflows/release.md` and `.ai/checklists/release.md`.

## Common Mistakes
- Generating code before reading requirements and context.
- Skipping tests, docs, security, or rollback planning.
- Duplicating business rules instead of centralizing contracts and validation.

## References
- `.ai/memory/project-memory.md`
- `.cursor/rules/global.md`
- `docs/README.md`
- `documents/sprint-planning/README.md`
- `documents/sprint-planning/sprint-00-project-foundation.md`
