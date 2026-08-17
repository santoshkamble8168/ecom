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

  /**
   * Locates a CMS `hero_banner` section (`CmsPageSections`) by the banner's
   * title, which is rendered as the wrapping link's accessible name.
   */
  heroBannerLink(title: string): Locator {
    return this.page.getByRole("link", { name: title });
  }

  /** Locates a CMS section heading (e.g. a `collection_grid` or `rich_text` title). */
  sectionHeading(text: string): Locator {
    return this.page.getByRole("heading", { name: text });
  }

  /**
   * Locates a link within a specific footer column by that column's
   * heading. Some footer link labels (e.g. "Privacy Policy") appear in more
   * than one column — the CMS-driven "Customer Service" column and the
   * still-hardcoded "Company" column both link to a page with that label,
   * to two different URLs — so a plain `getByRole("link", { name })` on the
   * footer is ambiguous.
   */
  footerColumnLink(columnHeading: string, linkLabel: string): Locator {
    const column = this.footer.getByRole("heading", { name: columnHeading, exact: true }).locator("xpath=..");
    return column.getByRole("link", { name: linkLabel, exact: true });
  }
}
