import type { Locator, Page } from "@playwright/test";

/** Sprint 14 admin analytics (`/analytics`). */
export class AdminAnalyticsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Analytics" });
  }

  async goto() {
    await this.page.goto("/analytics");
  }
}
