import { PrismaClient, type ReportKind } from "@prisma/client";

const SETTINGS: Array<{ key: string; value: unknown }> = [
  { key: "store.name", value: "ECOM" },
  { key: "store.currency", value: "INR" },
  { key: "store.timezone", value: "Asia/Kolkata" },
  { key: "store.maintenanceMode", value: false },
  { key: "seo.defaultTitle", value: "ECOM — Shop apparel" },
  { key: "notifications.emailEnabled", value: true },
];

const REPORTS: Array<{
  id: string;
  slug: string;
  name: string;
  kind: ReportKind;
  description: string;
}> = [
  { id: "report-sales", slug: "sales", name: "Sales", kind: "sales", description: "Confirmed order revenue, AOV, and order counts by day." },
  { id: "report-inventory", slug: "inventory", name: "Inventory", kind: "inventory", description: "On-hand, reserved, and low-stock SKUs by warehouse." },
  { id: "report-taxes", slug: "taxes", name: "Taxes", kind: "taxes", description: "Tax collected on confirmed orders." },
  { id: "report-retention", slug: "customer-retention", name: "Customer retention", kind: "customer_retention", description: "Repeat vs first-time buyers in the selected window." },
  { id: "report-product", slug: "product-performance", name: "Product performance", kind: "product_performance", description: "Units and revenue by product slug from order line items." },
  { id: "report-category", slug: "category-performance", name: "Category performance", kind: "category_performance", description: "Revenue grouped by product category." },
  { id: "report-search", slug: "search", name: "Search", kind: "search", description: "Search queries, result counts, and zero-result terms." },
  { id: "report-coupons", slug: "coupons", name: "Coupons", kind: "coupons", description: "Coupon redemptions and discount amounts." },
  { id: "report-campaigns", slug: "campaigns", name: "Campaigns", kind: "campaigns", description: "Campaign status and attached product/collection counts." },
];

/**
 * Sprint 12 defaults: platform settings and saved report definitions.
 */
export async function seedAdminDashboard(prisma: PrismaClient): Promise<void> {
  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as object },
      create: { key: setting.key, value: setting.value as object },
    });
  }

  for (const report of REPORTS) {
    await prisma.reportDefinition.upsert({
      where: { slug: report.slug },
      update: {
        name: report.name,
        kind: report.kind,
        description: report.description,
      },
      create: report,
    });
  }
}
