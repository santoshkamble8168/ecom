import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

test.describe("Admin recommendations", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("sidebar navigates to recommendations", async ({
    adminDashboard,
    adminRecommendations,
    page,
  }) => {
    await adminDashboard.goto();
    await expect(adminDashboard.heading).toBeVisible({ timeout: 15_000 });

    await adminDashboard.sidebarLink("Recommendations").click();
    await expect(page).toHaveURL(/\/recommendations$/);
    await expect(adminRecommendations.heading).toBeVisible({ timeout: 15_000 });
  });

  test("recommendations has no automatically detectable accessibility violations", async ({
    adminRecommendations,
    page,
  }) => {
    await adminRecommendations.goto();
    await expect(adminRecommendations.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading recommendation slots…")).toBeHidden({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });
});
