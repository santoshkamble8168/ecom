import { expect, test } from "../fixtures";

interface CmsMenuItem {
  label: string;
  children: CmsMenuItem[];
}

const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

/**
 * Sprint 11 storefront navigation: the header/footer render CMS-authored
 * menu items from the seeded `main-nav`/`footer` menus
 * (`apps/api/prisma/seeds/cms.seed.ts`, wired up in
 * `apps/storefront/src/app/layout.tsx`) in place of the hardcoded fallback.
 */
test.describe("Storefront CMS navigation", () => {
  test("header exposes all seeded main-nav items", async ({ storefrontHome, page }) => {
    await storefrontHome.goto();

    for (const label of ["T-Shirts", "New Arrivals", "Best Sellers", "About"]) {
      await expect(storefrontHome.navLink(label)).toBeVisible();
    }

    await storefrontHome.navLink("Best Sellers").click();
    await expect(page).toHaveURL(/\/collections\/best-sellers$/);
  });

  test("footer exposes seeded footer menu items", async ({ storefrontHome }) => {
    await storefrontHome.goto();

    // These render under the "Customer Service" column, sourced from the
    // seeded `footer` menu (see `menuItemsToNavigationNodes` wiring in
    // `apps/storefront/src/app/layout.tsx`).
    for (const label of ["Privacy Policy", "FAQ", "Contact", "Track Order"]) {
      await expect(storefrontHome.footerColumnLink("Customer Service", label)).toBeVisible();
    }
  });

  test("renders a flyout for any seeded main-nav item with children", async ({ storefrontHome, page }) => {
    const response = await page.request.get(`${API_URL}/cms/menus/main-nav`);
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data: { items: CmsMenuItem[] } };
    const itemWithChildren = body.data.items.find((item) => item.children.length > 0);

    await storefrontHome.goto();

    if (!itemWithChildren) {
      // Current seed data (`cms.seed.ts`) is a flat main-nav with no nested
      // items, so there is no flyout to exercise yet. Documented rather
      // than silently skipped, so this test starts asserting real flyout
      // behavior automatically once the seed grows nested items.
      test.info().annotations.push({
        type: "note",
        description: "Seeded main-nav menu has no items with children; flyout not exercised.",
      });
      return;
    }

    const trigger = storefrontHome.navLink(itemWithChildren.label);
    await trigger.hover();
    for (const child of itemWithChildren.children) {
      await expect(page.getByRole("link", { name: child.label, exact: true })).toBeVisible();
    }
  });
});
