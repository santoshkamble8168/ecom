import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

test.describe("Storefront shell", () => {
  test("renders the announcement bar, header, hero, and footer", async ({ storefrontHome }) => {
    await storefrontHome.goto();

    await expect(storefrontHome.announcementBar).toBeVisible();
    await expect(storefrontHome.shopNowButton).toBeVisible();
    await expect(storefrontHome.footer).toContainText("Ecom. All rights reserved.");
  });

  test("exposes primary navigation with working links", async ({ storefrontHome, page }) => {
    await storefrontHome.goto();

    await expect(storefrontHome.navLink("Men")).toBeVisible();
    await expect(storefrontHome.navLink("Women")).toBeVisible();

    await storefrontHome.navLink("Men").click();
    await expect(page).toHaveURL(/\/men$/);
  });

  test("has no automatically detectable accessibility violations", async ({
    storefrontHome,
    page,
  }) => {
    await storefrontHome.goto();
    await expectNoAccessibilityViolations(page);
  });
});
