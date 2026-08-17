import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

/**
 * Sprint 10 storefront pricing flows. The pricing seed
 * (`apps/api/prisma/seeds/pricing.seed.ts`) puts the "Classic Crew Neck
 * T-Shirt" product's first 3 variants on an active sale, and the
 * promotions seed's "Monsoon Flash Sale" campaign targets the
 * "New Arrivals" collection that the same product belongs to — so this
 * product shows both a sale price and a campaign badge out of the box.
 */
const SALE_PRODUCT_TITLE = "Classic Crew Neck T-Shirt";
const SALE_PRODUCT_SLUG = "classic-crew-neck-tee";
const CATEGORY_SLUG = "men-t-shirts";

test.describe("Storefront pricing and campaigns", () => {
  test("category PLP shows the sale price, strikethrough MRP, and campaign badge", async ({
    storefrontCategory,
  }) => {
    await storefrontCategory.goto(CATEGORY_SLUG);

    const card = storefrontCategory.productCard(SALE_PRODUCT_TITLE);
    await expect(card).toBeVisible({ timeout: 15_000 });
    // The strikethrough MRP, the computed discount, the "Sale" tag, and the
    // campaign badge ("15% OFF", from the active Monsoon Flash Sale
    // campaign) are all distinct spans rendered by `ProductCard`.
    await expect(card.getByText("Sale", { exact: true })).toBeVisible();
    await expect(card.getByText(/^\d+% off$/)).toBeVisible();
    await expect(card.getByText("15% OFF", { exact: true })).toBeVisible();
    // ₹799 is the seeded product's base `compareAtPrice`, shown struck through.
    await expect(card.getByText("₹799", { exact: true })).toBeVisible();
  });

  test("PDP shows the effective sale price and campaign badge for the same product", async ({
    storefrontProduct,
  }) => {
    await storefrontProduct.goto(SALE_PRODUCT_SLUG);

    // The h1 renders the brand ("ECOM", seeded on every product) rather
    // than the title itself; the title renders in a sibling element.
    await expect(storefrontProduct.productTitle(SALE_PRODUCT_TITLE)).toBeVisible({ timeout: 15_000 });
    await expect(storefrontProduct.page.getByText("Sale", { exact: true })).toBeVisible();
    await expect(storefrontProduct.campaignBadge).toHaveText("15% OFF");
    await expect(storefrontProduct.page.getByText("₹799", { exact: true })).toBeVisible();
  });

  test("category PLP has no automatically detectable accessibility violations", async ({
    storefrontCategory,
    page,
  }) => {
    await storefrontCategory.goto(CATEGORY_SLUG);
    await expect(storefrontCategory.productCard(SALE_PRODUCT_TITLE)).toBeVisible({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });
});
