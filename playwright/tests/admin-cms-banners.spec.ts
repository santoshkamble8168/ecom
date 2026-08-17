import { expect, test } from "../fixtures";

/**
 * Sprint 11 admin banner flow: verifies the Banners list renders the two
 * seeded `homepage_hero` banners from `apps/api/prisma/seeds/cms.seed.ts`
 * with the correct placement and published status.
 */
test.describe("Admin CMS banners", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("lists the seeded homepage hero banners", async ({ adminBannersList }) => {
    await adminBannersList.goto();

    await expect(adminBannersList.heading).toBeVisible();

    const heroOne = adminBannersList.rowByTitle("New Season Drop");
    await expect(heroOne).toBeVisible();
    await expect(heroOne).toContainText("homepage hero");
    await expect(heroOne).toContainText("Published");

    const heroTwo = adminBannersList.rowByTitle("Free Shipping Over");
    await expect(heroTwo).toBeVisible();
    await expect(heroTwo).toContainText("homepage hero");
    await expect(heroTwo).toContainText("Published");
  });
});
