import type { Locator, Page } from "@playwright/test";

/** Sprint 12 admin customers list (`/customers`). */
export class AdminCustomersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Customers" });
    this.searchInput = page.getByLabel("Search");
    this.statusFilter = page.getByLabel("Status");
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/customers");
  }

  rows(): Locator {
    return this.table.locator("tbody tr");
  }

  rowForEmail(email: string): Locator {
    return this.table.locator("tbody tr", { hasText: email });
  }
}

/** Sprint 12 admin customer detail (`/customers/[id]`). */
export class AdminCustomerDetailPage {
  readonly page: Page;
  readonly notesHeading: Locator;
  readonly noteInput: Locator;
  readonly addNoteButton: Locator;
  readonly suspendButton: Locator;
  readonly activateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.notesHeading = page.getByRole("heading", { name: "Notes" });
    this.noteInput = page.getByLabel("Note");
    this.addNoteButton = page.getByRole("button", { name: "Add note" });
    this.suspendButton = page.getByRole("button", { name: "Suspend" });
    this.activateButton = page.getByRole("button", { name: "Activate" });
  }
}
