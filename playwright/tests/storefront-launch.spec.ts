import { expect, test } from "../fixtures";

test.describe("Storefront launch checklist", () => {
  test("privacy and terms pages render", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
    await expect(page).toHaveTitle(/privacy policy/i);

    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /terms/i })).toBeVisible();
    await expect(page).toHaveTitle(/terms/i);
  });

  test("custom 404 page offers a shop CTA", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist-launch-check");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /shop now/i })).toBeVisible();
  });

  test("cookie consent banner can be accepted", async ({ page }) => {
    await page.goto("/");
    const accept = page.getByRole("button", { name: /accept all/i });
    await expect(accept).toBeVisible();
    await accept.click();
    await expect(accept).toHaveCount(0);
  });

  test("contact form validates before submit", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText(/enter your name/i)).toBeVisible();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("footer legal links are not broken", async ({ page, storefrontHome }) => {
    await storefrontHome.goto();
    await storefrontHome.footerColumnLink("Company", "Privacy Policy").click();
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });
});
