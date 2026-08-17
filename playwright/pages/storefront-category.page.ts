import type { Locator, Page } from "@playwright/test";

/**
 * Storefront category PLP (`/categories/[slug]`). Sprint 10 enriches each
 * product card with an effective/sale price and an optional campaign badge
 * (see `ProductCard` in `packages/ui/src/components/product-card.tsx`).
 */
export class StorefrontCategoryPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
  }

  async goto(slug: string) {
    await this.page.goto(`/categories/${slug}`);
  }

  /** The product card link containing the given (partial) title text. */
  productCard(titleSubstring: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(titleSubstring, "i") });
  }
}
