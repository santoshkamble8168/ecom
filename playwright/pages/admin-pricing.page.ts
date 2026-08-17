import type { Locator, Page } from "@playwright/test";

/**
 * Sprint 10 admin pricing list (`/pricing`): the effective/sale price
 * table and the "Edit Price" modal.
 */
export class AdminPricingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;
  readonly taxRulesLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Pricing · Prices" });
    this.table = page.locator("table");
    this.taxRulesLink = page.getByRole("link", { name: "Tax Rules" });
  }

  async goto() {
    await this.page.goto("/pricing");
  }

  rows(): Locator {
    return this.table.locator("tbody tr");
  }

  rowForSku(sku: string): Locator {
    return this.table.locator("tbody tr", { hasText: sku });
  }

  async openEdit(sku: string): Promise<void> {
    await this.rowForSku(sku).getByRole("button", { name: "Edit" }).click();
  }

  editModalHeading(sku: string): Locator {
    return this.page.getByRole("heading", { name: `Edit Price — ${sku}` });
  }

  get mrpInput(): Locator {
    return this.page.getByLabel("MRP");
  }

  get sellingPriceInput(): Locator {
    return this.page.getByLabel("Selling Price");
  }

  get cancelEditButton(): Locator {
    return this.page.getByRole("button", { name: "Cancel" });
  }
}

/** Sprint 10 admin tax rules list (`/pricing/tax-rules`). */
export class AdminTaxRulesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Pricing · Tax Rules" });
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/pricing/tax-rules");
  }

  rows(): Locator {
    return this.table.locator("tbody tr");
  }
}
