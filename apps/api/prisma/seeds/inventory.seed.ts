import { PrismaClient } from "@prisma/client";

const WAREHOUSES = [
  {
    code: "MUM1",
    name: "Mumbai Fulfillment Center",
    line1: "Plot 12, MIDC Industrial Area",
    line2: "Near Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400059",
    country: "IN",
    isDefault: true,
  },
  {
    code: "DEL1",
    name: "Delhi Fulfillment Center",
    line1: "Sector 5, Bawana Industrial Area",
    line2: null,
    city: "Delhi",
    state: "Delhi",
    postalCode: "110039",
    country: "IN",
    isDefault: false,
  },
];

const SUPPLIERS = [
  { name: "Fabrico Textiles Pvt Ltd", email: "orders@fabrico.example", phone: "+91-9876543210" },
  { name: "Weave & Co Apparel Manufacturing", email: "sales@weaveandco.example", phone: "+91-9123456780" },
];

function randomOnHand(): number {
  return Math.floor(Math.random() * (100 - 20 + 1)) + 20;
}

/**
 * Sprint 10 — inventory domain seed data: warehouses, sample stock levels
 * (including a couple of intentionally low-stock items), and suppliers.
 * Invoked from the main seed script; safe to re-run (idempotent upserts).
 */
export async function seedInventory(prisma: PrismaClient): Promise<void> {
  const warehousesByCode = new Map<string, { id: string }>();
  for (const warehouse of WAREHOUSES) {
    const created = await prisma.warehouse.upsert({
      where: { code: warehouse.code },
      update: {
        name: warehouse.name,
        line1: warehouse.line1,
        line2: warehouse.line2,
        city: warehouse.city,
        state: warehouse.state,
        postalCode: warehouse.postalCode,
        country: warehouse.country,
        isDefault: warehouse.isDefault,
      },
      create: warehouse,
    });
    warehousesByCode.set(warehouse.code, created);
  }

  const defaultWarehouse = warehousesByCode.get("MUM1");
  if (!defaultWarehouse) {
    throw new Error("Default warehouse (MUM1) was not created");
  }

  for (const supplier of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { name: supplier.name } });
    if (existing) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: { email: supplier.email, phone: supplier.phone },
      });
    } else {
      await prisma.supplier.create({ data: supplier });
    }
  }

  const variants = await prisma.productVariant.findMany({
    take: 15,
    orderBy: { createdAt: "asc" },
    select: { sku: true },
  });

  const lowStockSkus = new Set(variants.slice(0, 2).map((v) => v.sku));

  for (const variant of variants) {
    const onHand = lowStockSkus.has(variant.sku) ? Math.floor(Math.random() * 6) : randomOnHand();
    await prisma.stockItem.upsert({
      where: { warehouseId_variantSku: { warehouseId: defaultWarehouse.id, variantSku: variant.sku } },
      update: { onHand, lowStockThreshold: 5 },
      create: {
        warehouseId: defaultWarehouse.id,
        variantSku: variant.sku,
        onHand,
        lowStockThreshold: 5,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded inventory: ${WAREHOUSES.length} warehouses, ${SUPPLIERS.length} suppliers, ${variants.length} stock items (${lowStockSkus.size} intentionally low-stock).`,
  );
}
