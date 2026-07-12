import type { Locator, Page } from "@playwright/test";

/**
 * Encapsulates the storefront homepage shell so tests describe user
 * behavior instead of DOM structure. Extend this class as PLP, PDP, cart,
 * and checkout land in later sprints.
 */
export class StorefrontHomePage {
  readonly page: Page;
  readonly announcementBar: Locator;
  readonly primaryNav: Locator;
  readonly shopNowButton: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.announcementBar = page.getByText("Free shipping on orders above ₹999");
    this.primaryNav = page.getByRole("navigation", { name: "Primary" });
    this.shopNowButton = page.getByRole("button", { name: "Shop Now" });
    this.footer = page.locator("footer");
  }

  async goto() {
    await this.page.goto("/");
  }

  navLink(label: string): Locator {
    return this.primaryNav.getByRole("link", { name: label, exact: true });
  }
}
