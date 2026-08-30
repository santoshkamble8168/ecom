import type { Locator, Page } from "@playwright/test";

/** Sprint 16 admin recommendation slots (`/recommendations`). */
export class AdminRecommendationsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Recommendations" });
  }

  async goto() {
    await this.page.goto("/recommendations");
  }
}
