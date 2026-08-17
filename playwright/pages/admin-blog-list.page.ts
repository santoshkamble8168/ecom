import type { Locator, Page } from "@playwright/test";

/** Encapsulates the admin Blog Posts list at `/blog`. */
export class AdminBlogListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newPostButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Blog Posts" });
    this.newPostButton = page.getByRole("link", { name: "New Post" });
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/blog");
  }

  rowByTitle(title: string): Locator {
    return this.table.locator("tr", { hasText: title });
  }

  editLinkForTitle(title: string): Locator {
    return this.rowByTitle(title).getByRole("link", { name: "Edit" });
  }
}
