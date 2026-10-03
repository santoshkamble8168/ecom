import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

test.describe("Admin shell", () => {
  test("renders the sidebar and dashboard metric cards", async ({ adminDashboard }) => {
    await adminDashboard.goto();

    await expect(adminDashboard.heading).toBeVisible();
    await expect(adminDashboard.sidebarLink("Dashboard")).toBeVisible();
    await expect(adminDashboard.sidebarLink("Content")).toBeVisible();
    await expect(adminDashboard.sidebarLink("Pages")).toBeVisible();
    await expect(adminDashboard.sidebarLink("Media")).toBeVisible();
  });

  test("navigates between sidebar sections", async ({ adminDashboard, page }) => {
    await adminDashboard.goto();

    await adminDashboard.sidebarLink("Pages").click();
    await expect(page).toHaveURL(/\/pages$/);
  });

  test("has no automatically detectable accessibility violations", async ({
    adminDashboard,
    page,
  }) => {
    await adminDashboard.goto();
    await expectNoAccessibilityViolations(page);
  });
});
