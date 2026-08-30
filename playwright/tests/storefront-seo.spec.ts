import { expect, test } from "../fixtures";

test.describe("Storefront SEO", () => {
  test("robots.txt disallows checkout and points at the sitemap", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/robots.txt`);
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("Disallow: /checkout");
    expect(body).toContain("Sitemap:");
  });

  test("homepage includes Organization and WebSite JSON-LD", async ({ storefrontHome, page }) => {
    await storefrontHome.goto();
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
    const payloads = await jsonLd.allTextContents();
    const joined = payloads.join("\n");
    expect(joined).toContain("Organization");
    expect(joined).toContain("SearchAction");
  });
});
