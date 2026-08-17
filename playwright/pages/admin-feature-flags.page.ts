import type { Locator, Page } from "@playwright/test";

/** Sprint 12 admin feature flags (`/feature-flags`). */
export class AdminFeatureFlagsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Feature flags" });
  }

  async goto() {
    await this.page.goto("/feature-flags");
  }

  rowForKey(key: string): Locator {
    return this.page.getByRole("switch", { name: key, exact: true });
  }

  toggleFor(key: string): Locator {
    return this.page.getByRole("switch", { name: key, exact: true });
  }
}
