import { PrismaClient } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;
const SAMPLE_SIZE = 15;
const SALE_DEMO_COUNT = 3;
const SALE_DISCOUNT_FACTOR = 0.8;

/**
 * Sprint 10 pricing demo data: one default price list plus a `ProductPrice`
 * backfill for a sample of existing variants, with a few active sales for
 * demoing the effective-price/sale-window behaviour.
 */
export async function seedPricing(prisma: PrismaClient): Promise<void> {
  const priceList = await prisma.priceList.upsert({
    where: { code: "default-inr" },
    update: { name: "Default (INR)", isDefault: true },
    create: {
      code: "default-inr",
      name: "Default (INR)",
      currency: "INR",
      isDefault: true,
      isActive: true,
    },
  });

  const variants = await prisma.productVariant.findMany({
    take: SAMPLE_SIZE,
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const saleStartsAt = new Date(now.getTime() - DAY_MS);
  const saleEndsAt = new Date(now.getTime() + 7 * DAY_MS);

  for (const [index, variant] of variants.entries()) {
    const mrp = variant.compareAtPrice ?? variant.price;
    const sellingPrice = variant.price;
    const onSale = index < SALE_DEMO_COUNT;
    const salePrice = onSale ? Math.round(Number(sellingPrice) * SALE_DISCOUNT_FACTOR * 100) / 100 : null;

    const existing = await prisma.productPrice.findUnique({
      where: { priceListId_variantSku: { priceListId: priceList.id, variantSku: variant.sku } },
    });

    const data = {
      mrp,
      sellingPrice,
      salePrice: onSale ? salePrice!.toFixed(2) : null,
      saleStartsAt: onSale ? saleStartsAt : null,
      saleEndsAt: onSale ? saleEndsAt : null,
    };

    const saved = existing
      ? await prisma.productPrice.update({ where: { id: existing.id }, data })
      : await prisma.productPrice.create({
          data: { priceListId: priceList.id, variantSku: variant.sku, ...data },
        });

    await prisma.priceHistory.create({
      data: {
        productPriceId: saved.id,
        variantSku: variant.sku,
        oldMrp: existing?.mrp ?? null,
        newMrp: saved.mrp,
        oldSellingPrice: existing?.sellingPrice ?? null,
        newSellingPrice: saved.sellingPrice,
        reason: "Sprint 10 pricing seed backfill",
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed: pricing — ${variants.length} product prices backfilled (${SALE_DEMO_COUNT} on active sale).`);
}
