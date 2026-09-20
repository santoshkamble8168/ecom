import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

/**
 * Sprint 11 admin CMS page flow: lists the seeded pages, then opens the
 * homepage in the editor and verifies the SEO panel and section list
 * (`apps/api/prisma/seeds/cms.seed.ts`) render with real data. Logs in as
 * the seeded `admin@ecom.local` account since `/pages` sits behind
 * `AdminAuthGuard`.
 */
test.describe("Admin CMS pages", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("lists the seeded homepage and static pages", async ({ adminPagesList }) => {
    await adminPagesList.goto();

    await expect(adminPagesList.heading).toBeVisible();
    await expect(adminPagesList.rowByTitle("Homepage")).toBeVisible();
    await expect(adminPagesList.rowByTitle("Privacy Policy")).toBeVisible();
    await expect(adminPagesList.rowByTitle("Terms and Conditions")).toBeVisible();
    await expect(adminPagesList.rowByTitle("About Ecom")).toBeVisible();
    await expect(adminPagesList.rowByTitle("Contact us")).toBeVisible();
    await expect(adminPagesList.rowByTitle("Frequently Asked Questions")).toBeVisible();
  });

  test("opens the homepage in the editor and shows the SEO panel and sections", async ({
    adminPagesList,
    adminPageEditor,
    page,
  }) => {
    await adminPagesList.goto();
    await adminPagesList.editLinkForTitle("Homepage").click();

    await expect(page).toHaveURL(/\/pages\/[^/]+$/);
    await expect(adminPageEditor.heading).toBeVisible();

    // SEO panel fields render (Sprint 11 `SeoPanel`), even though the seed
    // doesn't populate SEO metadata for the homepage.
    await expect(adminPageEditor.seoTitleInput).toBeVisible();
    await expect(adminPageEditor.seoDescriptionInput).toBeVisible();
    await expect(adminPageEditor.seoCanonicalInput).toBeVisible();

    await expect(adminPageEditor.sectionsLabel).toBeVisible();
    await expect(adminPageEditor.sectionHeading("Hero")).toBeVisible();
    await expect(adminPageEditor.sectionHeading("Collection Grid")).toBeVisible();
    await expect(adminPageEditor.sectionHeading("Feature Grid")).toBeVisible();
    await expect(adminPageEditor.sectionHeading("Fit Guide")).toBeVisible();
    await expect(adminPageEditor.sectionHeading("Brand Story")).toBeVisible();
    await expect(adminPageEditor.sectionHeading("Trust Row")).toBeVisible();
    await expect(adminPageEditor.sectionHeading("Final CTA")).toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({ adminPagesList, page }) => {
    await adminPagesList.goto();
    await expectNoAccessibilityViolations(page);
  });
});
