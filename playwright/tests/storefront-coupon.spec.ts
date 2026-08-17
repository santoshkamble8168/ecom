import { expect, test } from "../fixtures";

/**
 * Sprint 10 storefront coupon application. Coupons apply directly to the
 * cart (guest carts are tracked via a client-generated session id, see
 * `apps/storefront/src/lib/session.ts`), so this flow needs neither
 * checkout nor login — add a seeded product to the bag, then redeem
 * `WELCOME10` (10% off, no minimum cart value; see
 * `apps/api/prisma/seed.ts`) from the cart page.
 */
const PRODUCT_SLUG = "classic-crew-neck-tee";

test.describe("Storefront cart coupon", () => {
  test("applying a seeded coupon reflects a discount in the cart totals", async ({
    storefrontProduct,
    storefrontCart,
  }) => {
    await storefrontProduct.goto(PRODUCT_SLUG);
    await expect(storefrontProduct.title).toBeVisible({ timeout: 15_000 });
    await storefrontProduct.addToBag("M");
    await expect(storefrontProduct.toast).toBeVisible();

    await storefrontCart.goto();
    await expect(storefrontCart.heading).toBeVisible({ timeout: 15_000 });

    await storefrontCart.applyCoupon("WELCOME10");

    await expect(storefrontCart.appliedCouponBadge("WELCOME10")).toBeVisible();
    await expect(storefrontCart.couponDiscountRow).toBeVisible();
  });
});
