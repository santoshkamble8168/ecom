import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

/**
 * Sprint 10 admin flows: inventory (stock + adjustments), pricing (prices +
 * tax rules), and promotions (coupons + campaigns). Logs in as the seeded
 * `admin@ecom.local` account via the dev OTP bypass before every test,
 * since these routes sit behind `AdminAuthGuard`.
 */
test.describe("Admin inventory, pricing, and promotions", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("stock table renders seeded inventory and flags low-stock items", async ({
    page,
    adminInventory,
  }) => {
    await adminInventory.goto();
    // Next dev serves this route on demand, so the first hit in a run can
    // take longer than the default assertion timeout to compile.
    await expect(adminInventory.heading).toBeVisible({ timeout: 15_000 });
    await expect(adminInventory.table).toBeVisible();

    // Sprint 10 seed data intentionally puts 2 SKUs below their low-stock
    // threshold in the default warehouse, so the banner should always show.
    await expect(adminInventory.lowStockBanner).toBeVisible();

    await page.goto("/inventory/warehouses");
    await expect(page.getByRole("heading", { name: "Inventory · Warehouses" })).toBeVisible();
    await expect(page.getByText("Mumbai Fulfillment Center")).toBeVisible();
  });

  test("adjusting stock updates the on-hand quantity for a SKU", async ({ adminInventory }) => {
    await adminInventory.goto();
    const row = adminInventory.rowForSku("CCN-BLK-M");
    await expect(row).toBeVisible();

    const onHandCell = row.locator("td").nth(3);
    const before = Number((await onHandCell.textContent())?.trim());
    expect(Number.isNaN(before)).toBe(false);

    await adminInventory.adjustStock("CCN-BLK-M", "1", "Playwright E2E adjustment");

    // Modal closes and the stock query refetches with the updated total.
    await expect(adminInventory.page.getByRole("heading", { name: "Adjust Stock" })).toBeHidden();
    await expect(row.locator("td").nth(3)).toHaveText(String(before + 1));
  });

  test("pricing list shows an active sale and the edit modal opens with existing values", async ({
    adminPricing,
  }) => {
    await adminPricing.goto();
    await expect(adminPricing.heading).toBeVisible({ timeout: 15_000 });
    await expect(adminPricing.table).toBeVisible();

    // Sprint 10 pricing seed puts the first 3 variants (all Classic Crew
    // Neck Tee SKUs) on an active sale.
    const saleRow = adminPricing.rowForSku("CCN-BLK-M");
    await expect(saleRow).toBeVisible();
    await expect(saleRow.getByText("Sale Active")).toBeVisible();

    await adminPricing.openEdit("CCN-BLK-M");
    await expect(adminPricing.editModalHeading("CCN-BLK-M")).toBeVisible();
    await expect(adminPricing.mrpInput).not.toHaveValue("");
    await expect(adminPricing.sellingPriceInput).not.toHaveValue("");
    await adminPricing.cancelEditButton.click();
    await expect(adminPricing.editModalHeading("CCN-BLK-M")).toBeHidden();
  });

  test("tax rules list renders the seeded GST rule", async ({ adminTaxRules }) => {
    await adminTaxRules.goto();
    await expect(adminTaxRules.heading).toBeVisible({ timeout: 15_000 });
    await expect(adminTaxRules.table).toContainText("GST Apparel (5%)");
    await expect(adminTaxRules.table).toContainText("5.00%");
  });

  test("coupon list links to a detail page with the coupon's key fields", async ({
    adminCoupons,
    adminCouponDetail,
  }) => {
    await adminCoupons.goto();
    await expect(adminCoupons.heading).toBeVisible({ timeout: 15_000 });
    await expect(adminCoupons.rowForCode("VIP20")).toBeVisible();

    await adminCoupons.openDetail("VIP20");
    await expect(adminCouponDetail.heading).toHaveText("Coupon: VIP20");
    await expect(adminCouponDetail.codeInput).toHaveValue("VIP20");
    await expect(adminCouponDetail.typeSelect).toHaveValue("percent");
    await expect(adminCouponDetail.valueInput).toHaveValue("20");
    await expect(adminCouponDetail.usageHistoryHeading).toBeVisible();
  });

  test("campaign list renders the seeded active campaign", async ({ adminCampaigns }) => {
    await adminCampaigns.goto();
    await expect(adminCampaigns.heading).toBeVisible({ timeout: 15_000 });
    const row = adminCampaigns.rowForName("Monsoon Flash Sale");
    await expect(row).toBeVisible();
    await expect(row).toContainText("Active");
    await expect(row).toContainText("15%");
  });

  test("inventory stock page has no automatically detectable accessibility violations", async ({
    page,
    adminInventory,
  }) => {
    await adminInventory.goto();
    await expect(adminInventory.heading).toBeVisible({ timeout: 15_000 });
    await expectNoAccessibilityViolations(page);
  });
});
