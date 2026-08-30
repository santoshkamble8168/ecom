import { expect, test } from "../fixtures";

test.describe("Storefront recommendations", () => {
  test("homepage renders the trending rail", async ({ storefrontHome, page }) => {
    await storefrontHome.goto();
    await expect(page.getByRole("heading", { name: "Trending now" })).toBeVisible({ timeout: 15_000 });
  });

  test("PDP renders similar styles", async ({ storefrontProduct, page }) => {
    await storefrontProduct.goto("classic-crew-neck-tee");
    await expect(storefrontProduct.title).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Similar styles" })).toBeVisible({ timeout: 15_000 });
  });
});
