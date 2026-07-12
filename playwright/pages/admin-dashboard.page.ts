import type { Locator, Page } from "@playwright/test";

/** Encapsulates the admin dashboard shell (sidebar + metric cards). */
export class AdminDashboardPage {
  readonly page: Page;
  readonly sidebarNav: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarNav = page.getByRole("navigation", { name: "Admin navigation" });
    this.heading = page.getByRole("heading", { name: "Dashboard" });
  }

  async goto() {
    await this.page.goto("/");
  }

  sidebarLink(label: string): Locator {
    return this.sidebarNav.getByRole("link", { name: label, exact: true });
  }
}
