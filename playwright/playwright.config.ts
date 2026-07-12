import { defineConfig, devices } from "@playwright/test";

const STOREFRONT_URL = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:3001";

/**
 * Sprint 0 smoke coverage for the storefront and admin app shells. Real
 * commerce flows (PLP, PDP, cart, checkout) get their own suites as those
 * features land in later sprints.
 *
 * These tests expect the storefront (3000) and admin (3001) dev servers
 * to already be running locally, e.g. via `pnpm dev`. In CI, start both
 * with `pnpm turbo run build && pnpm turbo run start` (or `pnpm dev`)
 * before invoking `pnpm --filter @ecom/e2e test:e2e`.
 */
export default defineConfig({
  testDir: "./tests",
  // Tests share a single long-running Next.js dev server per app (started
  // manually, not by this config), which recompiles routes on demand.
  // Running fully parallel causes contention that can transiently show
  // Next's dev overlay and swallow clicks, so we serialize execution here.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "storefront-chromium",
      testMatch: /storefront.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: STOREFRONT_URL },
    },
    {
      name: "admin-chromium",
      testMatch: /admin.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: ADMIN_URL },
    },
  ],
});
