import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

test.describe("Admin shell", () => {
  test("renders the sidebar and dashboard metric cards", async ({ adminDashboard }) => {
    await adminDashboard.goto();

    await expect(adminDashboard.heading).toBeVisible();
    await expect(adminDashboard.sidebarLink("Dashboard")).toBeVisible();
    await expect(adminDashboard.sidebarLink("Products")).toBeVisible();
    await expect(adminDashboard.sidebarLink("Orders")).toBeVisible();
  });

  test("navigates between sidebar sections", async ({ adminDashboard, page }) => {
    await adminDashboard.goto();

    await adminDashboard.sidebarLink("Products").click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test("has no automatically detectable accessibility violations", async ({
    adminDashboard,
    page,
  }) => {
    await adminDashboard.goto();
    await expectNoAccessibilityViolations(page);
  });
});
