import type { Locator, Page } from "@playwright/test";

/** Sprint 10 admin coupons list (`/coupons`). */
export class AdminCouponsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Coupons" });
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/coupons");
  }

  rows(): Locator {
    return this.table.locator("tbody tr");
  }

  rowForCode(code: string): Locator {
    return this.table.locator("tbody tr", { hasText: code });
  }

  async openDetail(code: string): Promise<void> {
    await this.rowForCode(code).getByRole("link", { name: "Edit" }).click();
  }
}

/** Sprint 10 admin coupon detail/edit page (`/coupons/[id]`). */
export class AdminCouponDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly codeInput: Locator;
  readonly typeSelect: Locator;
  readonly valueInput: Locator;
  readonly usageHistoryHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /^Coupon:/ });
    this.codeInput = page.getByLabel("Code");
    this.typeSelect = page.getByLabel("Type");
    this.valueInput = page.getByLabel(/^Value/);
    this.usageHistoryHeading = page.getByRole("heading", { name: "Usage History" });
  }
}

/** Sprint 10 admin campaigns list (`/campaigns`). */
export class AdminCampaignsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Campaigns" });
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/campaigns");
  }

  rows(): Locator {
    return this.table.locator("tbody tr");
  }

  rowForName(name: string): Locator {
    return this.table.locator("tbody tr", { hasText: name });
  }
}
