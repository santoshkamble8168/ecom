import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

test.describe("Storefront CMS and blog", () => {
  test("homepage renders CMS or legacy shell content", async ({ storefrontHome, page }) => {
    await storefrontHome.goto();
    const cmsCopy = page.getByText(/Why shop with us|New Arrivals|New Season Drop/i);
    const legacyCta = storefrontHome.shopNowButton;
    await expect(cmsCopy.or(legacyCta).first()).toBeVisible();
  });

  test("policy and FAQ CMS pages render", async ({ page }) => {
    await page.goto("/pages/privacy-policy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();

    await page.goto("/pages/faq");
    await expect(page.getByRole("heading", { name: /frequently asked questions/i })).toBeVisible();
    await expect(page.getByText(/How long does delivery take/i)).toBeVisible();
  });

  test("blog index and a seeded post render", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
    const postLink = page.getByRole("link", { name: /How to Style an Oversized Tee/i });
    await expect(postLink).toBeVisible();
    await postLink.click();
    await expect(page).toHaveURL(/\/blog\/how-to-style-an-oversized-tee/);
    await expect(page.getByRole("heading", { name: /How to Style an Oversized Tee/i })).toBeVisible();
  });

  test("header still exposes Men/Women navigation", async ({ storefrontHome, page }) => {
    await storefrontHome.goto();
    await expect(storefrontHome.navLink("Men")).toBeVisible();
    await expect(storefrontHome.navLink("Women")).toBeVisible();
    await storefrontHome.navLink("Men").click();
    await expect(page).toHaveURL(/\/men$/);
  });

  test("FAQ page has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/pages/faq");
    await expect(page.getByRole("heading", { name: /frequently asked questions/i })).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
});
