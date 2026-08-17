import type { Locator, Page } from "@playwright/test";

/** Sprint 12 admin platform settings (`/settings`). */
export class AdminSettingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly storeNameInput: Locator;
  readonly currencyInput: Locator;
  readonly timezoneInput: Locator;
  readonly maintenanceModeCheckbox: Locator;
  readonly seoTitleInput: Locator;
  readonly emailEnabledCheckbox: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Settings" });
    this.storeNameInput = page.getByLabel("store.name");
    this.currencyInput = page.getByLabel("store.currency");
    this.timezoneInput = page.getByLabel("store.timezone");
    this.maintenanceModeCheckbox = page.getByLabel("store.maintenanceMode");
    this.seoTitleInput = page.getByLabel("seo.defaultTitle");
    this.emailEnabledCheckbox = page.getByLabel("notifications.emailEnabled");
    this.saveButton = page.getByRole("button", { name: "Save settings" });
  }

  async goto() {
    await this.page.goto("/settings");
  }
}
