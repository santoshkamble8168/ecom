import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

/**
 * Sprint 14 admin analytics: KPIs, funnel, search, products, cohorts.
 * Logs in as the seeded `admin@ecom.local` account via the dev OTP bypass
 * before every test, since these routes sit behind `AdminAuthGuard`.
 */
test.describe("Admin analytics", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("sidebar navigates to analytics", async ({ adminDashboard, adminAnalytics, page }) => {
    await adminDashboard.goto();
    await expect(adminDashboard.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Analytics").click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(adminAnalytics.heading).toBeVisible({ timeout: 15_000 });
  });

  test("analytics has no automatically detectable accessibility violations", async ({
    adminAnalytics,
    page,
  }) => {
    await adminAnalytics.goto();
    await expect(adminAnalytics.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading analytics…")).toBeHidden({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });
});
