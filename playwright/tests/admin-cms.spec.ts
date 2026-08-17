import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

test.describe("Admin CMS and blog", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("pages list includes the seeded homepage", async ({ page }) => {
    await page.goto("/pages");
    await expect(page.getByRole("heading", { name: /page/i }).first()).toBeVisible();
    await expect(page.getByText(/home|Homepage/i).first()).toBeVisible();
  });

  test("banners list renders seeded homepage heroes", async ({ page }) => {
    await page.goto("/banners");
    await expect(page.getByText(/New Season Drop/i)).toBeVisible();
  });

  test("blog list renders seeded posts", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByText(/How to Style an Oversized Tee/i)).toBeVisible();
  });

  test("CMS pages list has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/pages");
    await expectNoAccessibilityViolations(page);
  });
});
