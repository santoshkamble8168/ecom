import type { Locator, Page } from "@playwright/test";

/** Encapsulates the storefront blog index at `/blog`, including category/tag filter pills. */
export class StorefrontBlogPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly postGrid: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Blog", exact: true, level: 1 });
    this.postGrid = page.locator("main");
  }

  async goto(query?: { category?: string; tag?: string }) {
    const params = new URLSearchParams();
    if (query?.category) params.set("category", query.category);
    if (query?.tag) params.set("tag", query.tag);
    const qs = params.toString();
    await this.page.goto(qs ? `/blog?${qs}` : "/blog");
  }

  postCardLink(title: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(title) });
  }

  categoryFilterLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  tagFilterLink(name: string): Locator {
    return this.page.getByRole("link", { name: `#${name}`, exact: true });
  }
}
