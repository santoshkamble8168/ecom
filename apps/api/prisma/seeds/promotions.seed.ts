import { PrismaClient } from "@prisma/client";

/**
 * Sprint 10: coupons demonstrating the new stacking/eligibility fields, plus
 * sample Campaign rows (one active, one scheduled) for the admin promotions
 * UI to have something to render out of the box. Existing coupons
 * (WELCOME10/FLAT100/FREESHIP/EXPIRED) are seeded elsewhere — this file only
 * adds to that set.
 */
export async function seedPromotions(prisma: PrismaClient): Promise<void> {
  await prisma.coupon.upsert({
    where: { code: "VIP20" },
    update: {
      description: "20% off for VIP customers, one redemption per customer",
      type: "percent",
      value: "20",
      combinable: false,
      perUserLimit: 1,
      isActive: true,
    },
    create: {
      code: "VIP20",
      description: "20% off for VIP customers, one redemption per customer",
      type: "percent",
      value: "20",
      combinable: false,
      perUserLimit: 1,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "COMBO5" },
    update: {
      description: "₹5 off, stackable with other combinable coupons",
      type: "fixed",
      value: "5",
      combinable: true,
      isActive: true,
    },
    create: {
      code: "COMBO5",
      description: "₹5 off, stackable with other combinable coupons",
      type: "fixed",
      value: "5",
      combinable: true,
      isActive: true,
    },
  });

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const featuredCollection = await prisma.collection.findFirst({ orderBy: { createdAt: "asc" } });

  const activeCampaign = await prisma.campaign.upsert({
    where: { slug: "monsoon-flash-sale" },
    update: {
      status: "active",
      startsAt: new Date(now - dayMs),
      endsAt: new Date(now + 7 * dayMs),
    },
    create: {
      name: "Monsoon Flash Sale",
      slug: "monsoon-flash-sale",
      type: "collection",
      status: "active",
      discountType: "percent",
      discountValue: "15",
      startsAt: new Date(now - dayMs),
      endsAt: new Date(now + 7 * dayMs),
    },
  });

  if (featuredCollection) {
    await prisma.campaignCollection.upsert({
      where: {
        campaignId_collectionId: {
          campaignId: activeCampaign.id,
          collectionId: featuredCollection.id,
        },
      },
      update: {},
      create: { campaignId: activeCampaign.id, collectionId: featuredCollection.id },
    });
  }

  await prisma.campaign.upsert({
    where: { slug: "festive-sitewide-sale" },
    update: {
      status: "scheduled",
      startsAt: new Date(now + 7 * dayMs),
      endsAt: new Date(now + 14 * dayMs),
    },
    create: {
      name: "Festive Sitewide Sale",
      slug: "festive-sitewide-sale",
      type: "sitewide",
      status: "scheduled",
      discountType: "percent",
      discountValue: "10",
      startsAt: new Date(now + 7 * dayMs),
      endsAt: new Date(now + 14 * dayMs),
    },
  });
}
