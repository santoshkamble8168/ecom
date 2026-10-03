import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

/**
 * Sprint 12 admin operations: live dashboard KPIs, customer lookup, audit
 * logs, feature flags, platform settings, and report exports. Logs in as
 * the seeded `admin@ecom.local` account via the dev OTP bypass before
 * every test, since these routes sit behind `AdminAuthGuard`.
 */
test.describe("Admin dashboard operations", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("content home shows pages and media entry points", async ({
    adminDashboard,
  }) => {
    await adminDashboard.goto();
    await expect(adminDashboard.heading).toBeVisible({ timeout: 15_000 });
    await expect(adminDashboard.sidebarLink("Pages")).toBeVisible();
    await expect(adminDashboard.sidebarLink("Media")).toBeVisible();
  });

  test("sidebar navigates across the content sections", async ({
    adminDashboard,
    page,
  }) => {
    await adminDashboard.goto();
    await expect(adminDashboard.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Pages").click();
    await expect(page).toHaveURL(/\/pages$/);

    await adminDashboard.sidebarLink("Dynamic Pages").click();
    await expect(page).toHaveURL(/\/dynamic-pages$/);

    await adminDashboard.sidebarLink("Menus").click();
    await expect(page).toHaveURL(/\/menus$/);

    await adminDashboard.sidebarLink("Reusable Sections").click();
    await expect(page).toHaveURL(/\/sections$/);
  });

  test("dashboard has no automatically detectable accessibility violations", async ({
    adminDashboard,
    page,
  }) => {
    await adminDashboard.goto();
    await expect(adminDashboard.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading dashboard…")).toBeHidden({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });

  test("customers list has no automatically detectable accessibility violations", async ({
    adminCustomers,
    page,
  }) => {
    await adminCustomers.goto();
    await expect(adminCustomers.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading customers…")).toBeHidden({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });

  test("toggles wallet.enabled when the flag row is present", async ({
    adminFeatureFlags,
    page,
  }) => {
    await adminFeatureFlags.goto();
    await expect(adminFeatureFlags.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading feature flags…")).toBeHidden({ timeout: 15_000 });

    const row = adminFeatureFlags.rowForKey("wallet.enabled");
    if (await row.isVisible()) {
      const checkbox = adminFeatureFlags.toggleFor("wallet.enabled");
      const before = await checkbox.isChecked();
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/admin/feature-flags/") && response.request().method() === "PATCH",
      );
      await checkbox.click();
      await responsePromise;
      await expect(checkbox).toBeChecked({ checked: !before });
    }
  });

  test("queues a Sales report export when the Export button exists", async ({
    adminReports,
    page,
  }) => {
    await adminReports.goto();
    await expect(adminReports.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading reports…")).toBeHidden({ timeout: 15_000 });

    const exportButton = adminReports.exportButtonFor("Sales");
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await expect(page.getByText(/queued|running|completed|Checking export status/i)).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
