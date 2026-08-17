import type { Locator, Page } from "@playwright/test";

/** Sprint 12 admin audit log viewer (`/audit-logs`). */
export class AdminAuditLogsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly exportCsvButton: Locator;
  readonly applyFiltersButton: Locator;
  readonly table: Locator;
  readonly actorIdInput: Locator;
  readonly actionInput: Locator;
  readonly entityTypeInput: Locator;
  readonly entityIdInput: Locator;
  readonly correlationIdInput: Locator;
  readonly fromInput: Locator;
  readonly toInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Audit logs" });
    this.exportCsvButton = page.getByRole("button", { name: "Export CSV" });
    this.applyFiltersButton = page.getByRole("button", { name: "Apply filters" });
    this.table = page.locator("table");
    this.actorIdInput = page.getByLabel("Actor ID");
    this.actionInput = page.getByLabel("Action");
    this.entityTypeInput = page.getByLabel("Entity type");
    this.entityIdInput = page.getByLabel("Entity ID");
    this.correlationIdInput = page.getByLabel("Correlation ID");
    this.fromInput = page.getByLabel("From");
    this.toInput = page.getByLabel("To");
  }

  async goto() {
    await this.page.goto("/audit-logs");
  }

  rows(): Locator {
    return this.table.locator("tbody tr");
  }
}
