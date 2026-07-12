# End-to-End Tests (`@ecom/e2e`)

Playwright smoke suite for the storefront and admin app shells, following
the Page Object Model.

## Layout

- `pages/` — page objects that hide selector details behind user-facing
  methods (`goto()`, `navLink(label)`, etc.).
- `fixtures/` — a custom Playwright `test` that injects ready-to-use page
  objects (`storefrontHome`, `adminDashboard`).
- `utils/` — shared helpers, including an axe-core accessibility check
  (`expectNoAccessibilityViolations`).
- `tests/` — the actual specs, one file per app shell.

## Running locally

1. Start the infra + apps under test:

   ```bash
   pnpm docker:up
   pnpm --filter @ecom/storefront dev   # http://localhost:3000
   pnpm --filter @ecom/admin dev        # http://localhost:3001
   ```

2. Install browsers once per machine:

   ```bash
   pnpm --filter @ecom/e2e exec playwright install --with-deps chromium
   ```

3. Run the suite:

   ```bash
   pnpm --filter @ecom/e2e test:e2e
   pnpm --filter @ecom/e2e test:e2e:ui     # interactive mode
   pnpm --filter @ecom/e2e test:e2e:report # open the last HTML report
   ```

`STOREFRONT_URL` and `ADMIN_URL` env vars override the default
`localhost:3000` / `localhost:3001` base URLs (useful in CI or against a
deployed preview).

## Scope

Sprint 0 covers app-shell smoke tests only (header, nav, footer, sidebar,
dashboard cards) plus a baseline accessibility scan on each shell. Real
commerce journeys (PLP, PDP, cart, checkout) get their own suites as those
features land in later sprints.

## Conventions

- Use role-based, accessible-name selectors (`getByRole`), never CSS
  selectors tied to layout.
- Keep tests independent and parallel-safe; do not share state across
  tests.
- Every shell test includes an axe-core accessibility assertion.
