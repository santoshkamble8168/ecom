import type { Locator, Page } from "@playwright/test";

/**
 * Storefront cart page (`/cart`), including the "Have a coupon?" panel.
 * Coupons apply directly to the guest/logged-in cart, so this flow does
 * not require checkout or authentication.
 */
export class StorefrontCartPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly couponDiscountRow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /My Bag/ });
    this.couponInput = page.getByPlaceholder("Enter coupon code");
    this.applyCouponButton = page.getByRole("button", { name: "Apply" });
    this.couponDiscountRow = page.getByText("Coupon discount");
  }

  async goto() {
    await this.page.goto("/cart");
  }

  async applyCoupon(code: string): Promise<void> {
    await this.couponInput.fill(code);
    await this.applyCouponButton.click();
  }

  appliedCouponBadge(code: string): Locator {
    return this.page.getByText(`${code} applied`);
  }
}
