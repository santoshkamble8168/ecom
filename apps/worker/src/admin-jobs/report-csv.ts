import type { Prisma, ReportKind } from "@prisma/client";

import type { PrismaService } from "../prisma/prisma.service";

import { toCsv } from "./csv";

const PAID_ORDER_STATUSES_EXCLUDED: Prisma.EnumOrderStatusFilter["notIn"] = [
  "pending_payment",
  "cancelled",
  "failed",
];

type LineItemSnapshot = {
  variantSku?: string;
  quantity?: number;
  unitPrice?: unknown;
  product?: { title?: string } | null;
};

/**
 * Builds a CSV string for a report kind by querying the same Prisma DB the API uses.
 * `rowCount` is the number of data rows (header is not counted).
 */
export async function buildReportCsv(
  prisma: PrismaService,
  kind: ReportKind,
): Promise<{ csv: string; rowCount: number }> {
  switch (kind) {
    case "sales":
      return salesCsv(prisma);
    case "inventory":
      return inventoryCsv(prisma);
    case "taxes":
      return taxesCsv(prisma);
    case "customer_retention":
      return customerRetentionCsv(prisma);
    case "product_performance":
      return productPerformanceCsv(prisma);
    case "category_performance":
      return categoryPerformanceCsv(prisma);
    case "search":
      return searchCsv(prisma);
    case "coupons":
      return couponsCsv(prisma);
    case "campaigns":
      return campaignsCsv(prisma);
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unsupported report kind: ${String(exhaustive)}`);
    }
  }
}

function pack(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>) {
  return { csv: toCsv(headers, rows), rowCount: rows.length };
}

function paidOrdersWhere(): Prisma.OrderWhereInput {
  return { status: { notIn: PAID_ORDER_STATUSES_EXCLUDED } };
}

async function salesCsv(prisma: PrismaService) {
  const orders = await prisma.order.findMany({
    where: paidOrdersWhere(),
    select: { orderNumber: true, status: true, total: true, currency: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return pack(
    ["orderNumber", "status", "total", "currency", "createdAt"],
    orders.map((o) => [o.orderNumber, o.status, o.total, o.currency, o.createdAt]),
  );
}

async function inventoryCsv(prisma: PrismaService) {
  const items = await prisma.stockItem.findMany({
    select: {
      warehouseId: true,
      variantSku: true,
      onHand: true,
      reserved: true,
      lowStockThreshold: true,
    },
    orderBy: [{ warehouseId: "asc" }, { variantSku: "asc" }],
  });
  return pack(
    ["warehouseId", "variantSku", "onHand", "reserved", "lowStockThreshold"],
    items.map((i) => [i.warehouseId, i.variantSku, i.onHand, i.reserved, i.lowStockThreshold]),
  );
}

async function taxesCsv(prisma: PrismaService) {
  const orders = await prisma.order.findMany({
    where: paidOrdersWhere(),
    select: { orderNumber: true, taxAmount: true, total: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return pack(
    ["orderNumber", "taxAmount", "total", "createdAt"],
    orders.map((o) => [o.orderNumber, o.taxAmount, o.total, o.createdAt]),
  );
}

async function customerRetentionCsv(prisma: PrismaService) {
  const users = await prisma.user.findMany({
    where: { orders: { some: {} } },
    take: 5000,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      _count: { select: { orders: true } },
    },
  });
  return pack(
    ["id", "email", "orderCount"],
    users.map((u) => [u.id, u.email, u._count.orders]),
  );
}

async function productPerformanceCsv(prisma: PrismaService) {
  const orders = await prisma.order.findMany({
    where: paidOrdersWhere(),
    select: { orderNumber: true, lineItems: true },
    orderBy: { createdAt: "asc" },
  });

  const aggregated = new Map<
    string,
    { variantSku: string; productTitle: string; quantity: number; revenue: number }
  >();

  for (const order of orders) {
    const items = Array.isArray(order.lineItems) ? (order.lineItems as LineItemSnapshot[]) : [];
    for (const item of items) {
      const sku = item.variantSku;
      if (!sku) continue;
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const existing = aggregated.get(sku) ?? {
        variantSku: sku,
        productTitle: item.product?.title ?? "",
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += quantity;
      existing.revenue += quantity * unitPrice;
      if (!existing.productTitle && item.product?.title) {
        existing.productTitle = item.product.title;
      }
      aggregated.set(sku, existing);
    }
  }

  const rows = [...aggregated.values()].map((r) => [
    r.variantSku,
    r.productTitle,
    r.quantity,
    r.revenue.toFixed(2),
  ]);
  return pack(["variantSku", "productTitle", "quantity", "revenue"], rows);
}

async function categoryPerformanceCsv(prisma: PrismaService) {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      categories: { select: { category: { select: { name: true } } } },
    },
    orderBy: { title: "asc" },
  });
  return pack(
    ["productId", "title", "slug", "categories"],
    products.map((p) => [
      p.id,
      p.title,
      p.slug,
      p.categories.map((c) => c.category.name).join("; "),
    ]),
  );
}

async function searchCsv(prisma: PrismaService) {
  const logs = await prisma.searchLog.findMany({
    select: { query: true, resultCount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return pack(
    ["query", "resultCount", "createdAt"],
    logs.map((l) => [l.query, l.resultCount, l.createdAt]),
  );
}

async function couponsCsv(prisma: PrismaService) {
  const usages = await prisma.couponUsage.findMany({
    select: { couponId: true, userId: true, discountAmount: true, usedAt: true },
    orderBy: { usedAt: "asc" },
  });
  return pack(
    ["couponId", "userId", "discountAmount", "usedAt"],
    usages.map((u) => [u.couponId, u.userId, u.discountAmount, u.usedAt]),
  );
}

async function campaignsCsv(prisma: PrismaService) {
  const campaigns = await prisma.campaign.findMany({
    select: { name: true, slug: true, status: true, type: true, startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });
  return pack(
    ["name", "slug", "status", "type", "startsAt", "endsAt"],
    campaigns.map((c) => [c.name, c.slug, c.status, c.type, c.startsAt, c.endsAt]),
  );
}
