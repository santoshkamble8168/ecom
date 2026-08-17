import type { Locator, Page } from "@playwright/test";

/**
 * Encapsulates the admin blog post editor at `/blog/[id]`, covering the
 * category/tag pickers (`CategoryPicker`/`TagPicker`) and content fields.
 */
export class AdminBlogEditorPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly categoriesLabel: Locator;
  readonly tagsLabel: Locator;
  readonly contentInput: Locator;
  readonly titleInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Edit Blog Post" });
    this.categoriesLabel = page.getByText("Categories", { exact: true });
    this.tagsLabel = page.getByText("Tags", { exact: true });
    this.contentInput = page.getByLabel("Content (HTML)");
    // Exact match: the SEO panel's "SEO title" label would otherwise also
    // match a substring search for "Title".
    this.titleInput = page.getByLabel("Title", { exact: true });
  }

  categoryCheckbox(name: string): Locator {
    return this.page.getByRole("checkbox", { name });
  }

  tagCheckbox(name: string): Locator {
    return this.page.getByRole("checkbox", { name });
  }
}
