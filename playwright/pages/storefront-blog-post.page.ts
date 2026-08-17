import type { Locator, Page } from "@playwright/test";

/** Encapsulates a storefront blog post detail page at `/blog/[slug]`. */
export class StorefrontBlogPostPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly article: Locator;
  readonly breadcrumb: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.article = page.locator("article");
    this.breadcrumb = page.locator("nav").filter({ hasText: "Blog" });
  }

  async goto(slug: string) {
    await this.page.goto(`/blog/${slug}`);
  }

  tagLink(name: string): Locator {
    return this.page.getByRole("link", { name: `#${name}` });
  }
}
