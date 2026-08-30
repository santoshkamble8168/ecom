import type { Locator, Page } from "@playwright/test";

/** Sprint 13 admin notification templates (`/notifications/templates`). */
export class AdminNotificationTemplatesPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Templates" });
  }

  async goto() {
    await this.page.goto("/notifications/templates");
  }
}

/** Sprint 13 admin notification deliveries (`/notifications/deliveries`). */
export class AdminNotificationDeliveriesPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Deliveries" });
  }

  async goto() {
    await this.page.goto("/notifications/deliveries");
  }
}
