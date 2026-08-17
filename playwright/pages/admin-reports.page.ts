import type { Locator, Page } from "@playwright/test";

/** Sprint 12 admin reports catalog (`/reports`). */
export class AdminReportsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Reports" });
  }

  async goto() {
    await this.page.goto("/reports");
  }

  cardForName(name: string): Locator {
    return this.page.getByRole("article", { name: `${name} report` });
  }

  exportButtonFor(name: string): Locator {
    return this.cardForName(name).getByRole("button", { name: "Export" });
  }
}
