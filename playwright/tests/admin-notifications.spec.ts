import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

/**
 * Sprint 13 admin notifications: template catalog and delivery logs.
 * Logs in as the seeded `admin@ecom.local` account via the dev OTP bypass
 * before every test, since these routes sit behind `AdminAuthGuard`.
 */
test.describe("Admin notifications", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("notification routes still open directly", async ({
    adminNotificationTemplates,
    adminNotificationDeliveries,
    page,
  }) => {
    await page.goto("/notifications/templates");
    await expect(page).toHaveURL(/\/notifications\/templates$/);
    await expect(adminNotificationTemplates.heading).toBeVisible({ timeout: 15_000 });

    await page.goto("/notifications/deliveries");
    await expect(page).toHaveURL(/\/notifications\/deliveries$/);
    await expect(adminNotificationDeliveries.heading).toBeVisible({ timeout: 15_000 });
  });

  test("templates has no automatically detectable accessibility violations", async ({
    adminNotificationTemplates,
    page,
  }) => {
    await adminNotificationTemplates.goto();
    await expect(adminNotificationTemplates.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading templates…")).toBeHidden({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });

  test("deliveries has no automatically detectable accessibility violations", async ({
    adminNotificationDeliveries,
    page,
  }) => {
    await adminNotificationDeliveries.goto();
    await expect(adminNotificationDeliveries.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading deliveries…")).toBeHidden({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });
});
