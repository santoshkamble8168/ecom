import type { Locator, Page } from "@playwright/test";

/** Encapsulates the admin CMS Banners list at `/banners`. */
export class AdminBannersListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newBannerButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Banners", exact: true });
    this.newBannerButton = page.getByRole("button", { name: "New Banner" });
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/banners");
  }

  rowByTitle(title: string): Locator {
    return this.table.locator("tr", { hasText: title });
  }
}
