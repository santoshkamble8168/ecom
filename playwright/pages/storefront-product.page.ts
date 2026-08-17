import type { Locator, Page } from "@playwright/test";

/**
 * Storefront PDP (`/products/[slug]`). Sprint 10 adds effective/sale
 * pricing (`PriceDisplay`) and an optional campaign badge to the price
 * block (see `PdpView`).
 */
export class StorefrontProductPage {
  readonly page: Page;
  readonly title: Locator;
  readonly addToBagButton: Locator;
  readonly campaignBadge: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole("heading", { level: 1 });
    // Two "Add to Bag" buttons render (main CTA + sticky mobile bar); both
    // trigger the same handler, so the first is sufficient.
    this.addToBagButton = page.getByRole("button", { name: "Add to Bag" }).first();
    this.campaignBadge = page.getByText(/% OFF/);
    this.toast = page.getByText("Added to your bag!");
  }

  async goto(slug: string) {
    await this.page.goto(`/products/${slug}`);
  }

  /** Clicks "Add to Bag", picks a size in the picker modal if it opens
   * (only shown when a size hasn't been selected yet), and confirms. */
  async addToBag(sizeLabel: string): Promise<void> {
    await this.addToBagButton.click();
    const dialog = this.page.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole("button", { name: sizeLabel, exact: true }).click();
      await dialog.getByRole("button", { name: "Add to Bag" }).click();
    }
  }
}
