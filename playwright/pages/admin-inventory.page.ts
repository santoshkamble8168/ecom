import type { Locator, Page } from "@playwright/test";

/**
 * Sprint 10 admin inventory stock list (`/inventory`): the stock table,
 * the low-stock banner, and the "Adjust Stock" modal.
 */
export class AdminInventoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly lowStockOnlyCheckbox: Locator;
  readonly table: Locator;
  readonly adjustStockButton: Locator;
  readonly lowStockBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Inventory · Stock" });
    this.lowStockOnlyCheckbox = page.getByLabel("Low stock only");
    this.table = page.locator("table");
    this.adjustStockButton = page.getByRole("button", { name: "Adjust Stock" }).first();
    this.lowStockBanner = page.getByText(/running low on stock/);
  }

  async goto() {
    await this.page.goto("/inventory");
  }

  rows(): Locator {
    return this.table.locator("tbody tr");
  }

  rowForSku(sku: string): Locator {
    return this.table.locator("tbody tr", { hasText: sku });
  }

  /** Opens the "Adjust Stock" modal, fills the form, and submits it,
   * waiting for the `/admin/stock/adjust` response so the caller can rely
   * on the mutation having actually completed. The modal is appended last
   * in the DOM, so its `<form>` is the last one on the page (the SKU
   * search box above is also a `<form>`). */
  async adjustStock(variantSku: string, delta: string, note?: string): Promise<void> {
    await this.adjustStockButton.click();
    await this.page.getByRole("heading", { name: "Adjust Stock" }).waitFor();
    const form = this.page.locator("form").last();
    await form.getByLabel("Variant SKU").fill(variantSku);
    await form.getByLabel(/^Delta/).fill(delta);
    if (note) {
      await form.getByLabel("Note (optional)").fill(note);
    }
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/admin/stock/adjust") && response.request().method() === "POST",
    );
    await form.getByRole("button", { name: /^Adjust Stock$|^Adjusting…$/ }).click();
    await responsePromise;
  }
}
