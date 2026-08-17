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

  test("dashboard shows the heading and at least one revenue KPI", async ({
    adminDashboard,
  }) => {
    await adminDashboard.goto();
    await expect(adminDashboard.heading).toBeVisible({ timeout: 15_000 });
    await expect(adminDashboard.page.getByText(/Dashboard/)).toBeVisible();
    await expect(adminDashboard.kpiMatching(/Revenue/i)).toBeVisible({ timeout: 15_000 });
  });

  test("sidebar navigates to customers, audit logs, feature flags, settings, and reports", async ({
    adminDashboard,
    adminCustomers,
    adminAuditLogs,
    adminFeatureFlags,
    adminSettings,
    adminReports,
    page,
  }) => {
    await adminDashboard.goto();
    await expect(adminDashboard.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Customers").click();
    await expect(page).toHaveURL(/\/customers$/);
    await expect(adminCustomers.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Audit logs").click();
    await expect(page).toHaveURL(/\/audit-logs$/);
    await expect(adminAuditLogs.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Feature flags").click();
    await expect(page).toHaveURL(/\/feature-flags$/);
    await expect(adminFeatureFlags.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Settings").click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(adminSettings.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Reports").click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(adminReports.heading).toBeVisible({ timeout: 15_000 });
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
