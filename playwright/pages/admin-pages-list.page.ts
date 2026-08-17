import type { Locator, Page } from "@playwright/test";

/** Encapsulates the admin CMS Pages list at `/pages`. */
export class AdminPagesListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newPageButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Pages", exact: true });
    this.newPageButton = page.getByRole("link", { name: "New Page" });
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/pages");
  }

  rowByTitle(title: string): Locator {
    return this.table.locator("tr", { hasText: title });
  }

  editLinkForTitle(title: string): Locator {
    return this.rowByTitle(title).getByRole("link", { name: "Edit" });
  }
}
