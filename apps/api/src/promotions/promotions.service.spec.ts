import { ConflictError, NotFoundError, ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { PromotionsService } from "./promotions.service";

function baseCoupon(overrides: Record<string, unknown> = {}) {
  return {
    id: "coupon-1",
    code: "VIP20",
    description: "VIP coupon",
    type: "percent",
    value: { toString: () => "20" },
    minCartValue: null,
    maxUses: null,
    usedCount: 0,
    perUserLimit: null,
    combinable: true,
    eligibleCategoryIds: [] as string[],
    eligibleCollectionIds: [] as string[],
    expiresAt: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function baseCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "campaign-1",
    name: "Flash Sale",
    slug: "flash-sale",
    type: "sitewide",
    status: "scheduled",
    discountType: "percent",
    discountValue: { toString: () => "15" },
    startsAt: new Date("2026-08-20T00:00:00Z"),
    endsAt: new Date("2026-08-27T00:00:00Z"),
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    products: [] as { variantSku: string }[],
    collections: [] as { collectionId: string }[],
    ...overrides,
  };
}

describe("PromotionsService", () => {
  let service: PromotionsService;
  let prisma: {
    coupon: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    couponUsage: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
    campaign: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    campaignProduct: { upsert: jest.Mock; deleteMany: jest.Mock };
    campaignCollection: { upsert: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      coupon: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      couponUsage: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
      campaign: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      campaignProduct: { upsert: jest.fn(), deleteMany: jest.fn() },
      campaignCollection: { upsert: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg())),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new PromotionsService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  describe("validateCouponForUser", () => {
    it("rejects an inactive coupon", async () => {
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ isActive: false }));

      await expect(service.validateCouponForUser("VIP20", { subtotal: 1000 })).rejects.toThrow(
        ValidationError,
      );
    });

    it("rejects an expired coupon", async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        baseCoupon({ expiresAt: new Date("2020-01-01T00:00:00Z") }),
      );

      await expect(service.validateCouponForUser("VIP20", { subtotal: 1000 })).rejects.toThrow(
        ValidationError,
      );
    });

    it("rejects when usage limit has been reached", async () => {
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ maxUses: 5, usedCount: 5 }));

      await expect(service.validateCouponForUser("VIP20", { subtotal: 1000 })).rejects.toThrow(
        ValidationError,
      );
    });

    it("rejects when subtotal is below the minimum cart value", async () => {
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ minCartValue: { toString: () => "500" } }));

      await expect(service.validateCouponForUser("VIP20", { subtotal: 100 })).rejects.toThrow(
        ValidationError,
      );
    });

    it("rejects when the per-user limit has been reached", async () => {
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ perUserLimit: 1 }));
      prisma.couponUsage.count.mockResolvedValue(1);

      await expect(
        service.validateCouponForUser("VIP20", { subtotal: 1000, userId: "user-1" }),
      ).rejects.toThrow(ValidationError);
      expect(prisma.couponUsage.count).toHaveBeenCalledWith({
        where: { couponId: "coupon-1", userId: "user-1" },
      });
    });

    it("rejects a non-combinable coupon when other codes are already applied", async () => {
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ combinable: false }));

      await expect(
        service.validateCouponForUser("VIP20", { subtotal: 1000, otherAppliedCodes: ["COMBO5"] }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects when the cart has no items in the eligible categories", async () => {
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ eligibleCategoryIds: ["cat-1"] }));

      await expect(
        service.validateCouponForUser("VIP20", { subtotal: 1000, cartCategoryIds: ["cat-2"] }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects when the cart has no items in the eligible collections", async () => {
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ eligibleCollectionIds: ["col-1"] }));

      await expect(
        service.validateCouponForUser("VIP20", { subtotal: 1000, cartCollectionIds: ["col-2"] }),
      ).rejects.toThrow(ValidationError);
    });

    it("accepts a valid combinable, eligible coupon and computes the discount", async () => {
      prisma.coupon.findUnique.mockResolvedValue(
        baseCoupon({
          combinable: true,
          eligibleCategoryIds: ["cat-1"],
          eligibleCollectionIds: ["col-1"],
        }),
      );

      const result = await service.validateCouponForUser("VIP20", {
        subtotal: 1000,
        otherAppliedCodes: ["COMBO5"],
        cartCategoryIds: ["cat-1"],
        cartCollectionIds: ["col-1"],
      });

      expect(result).toEqual({
        code: "VIP20",
        type: "percent",
        discountAmount: 200,
        message: "20% off applied",
      });
    });

    it("throws for an unknown coupon code", async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.validateCouponForUser("MISSING", { subtotal: 1000 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("recordCouponUsage", () => {
    it("creates a usage row and increments usedCount in a transaction", async () => {
      await service.recordCouponUsage("coupon-1", {
        userId: "user-1",
        orderId: "order-1",
        discountAmount: 200,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.couponUsage.create).toHaveBeenCalledWith({
        data: {
          couponId: "coupon-1",
          userId: "user-1",
          sessionId: undefined,
          orderId: "order-1",
          discountAmount: 200,
        },
      });
      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: "coupon-1" },
        data: { usedCount: { increment: 1 } },
      });
    });
  });

  describe("campaign product/collection attach-detach", () => {
    it("attaches products via upsert and returns the refreshed summary", async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign());
      prisma.campaign.findUniqueOrThrow.mockResolvedValue(
        baseCampaign({ products: [{ variantSku: "SKU-1" }] }),
      );

      const result = await service.attachCampaignProducts(
        "campaign-1",
        { variantSkus: ["SKU-1"] },
        "admin-1",
      );

      expect(prisma.campaignProduct.upsert).toHaveBeenCalledWith({
        where: { campaignId_variantSku: { campaignId: "campaign-1", variantSku: "SKU-1" } },
        update: {},
        create: { campaignId: "campaign-1", variantSku: "SKU-1" },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "CampaignProductsAttached" }),
      );
      expect(result.productSkus).toEqual(["SKU-1"]);
    });

    it("throws NotFoundError when attaching products to a missing campaign", async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.attachCampaignProducts("missing", { variantSkus: ["SKU-1"] }, "admin-1"),
      ).rejects.toThrow(NotFoundError);
    });

    it("detaches a product", async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign());
      prisma.campaign.findUniqueOrThrow.mockResolvedValue(baseCampaign());

      await service.detachCampaignProduct("campaign-1", "SKU-1", "admin-1");

      expect(prisma.campaignProduct.deleteMany).toHaveBeenCalledWith({
        where: { campaignId: "campaign-1", variantSku: "SKU-1" },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "CampaignProductDetached" }),
      );
    });

    it("attaches collections via upsert", async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign());
      prisma.campaign.findUniqueOrThrow.mockResolvedValue(
        baseCampaign({ collections: [{ collectionId: "col-1" }] }),
      );

      const result = await service.attachCampaignCollections(
        "campaign-1",
        { collectionIds: ["col-1"] },
        "admin-1",
      );

      expect(prisma.campaignCollection.upsert).toHaveBeenCalledWith({
        where: { campaignId_collectionId: { campaignId: "campaign-1", collectionId: "col-1" } },
        update: {},
        create: { campaignId: "campaign-1", collectionId: "col-1" },
      });
      expect(result.collectionIds).toEqual(["col-1"]);
    });

    it("detaches a collection", async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign());
      prisma.campaign.findUniqueOrThrow.mockResolvedValue(baseCampaign());

      await service.detachCampaignCollection("campaign-1", "col-1", "admin-1");

      expect(prisma.campaignCollection.deleteMany).toHaveBeenCalledWith({
        where: { campaignId: "campaign-1", collectionId: "col-1" },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "CampaignCollectionDetached" }),
      );
    });
  });

  describe("createCampaign", () => {
    it("rejects when startsAt is not before endsAt", async () => {
      await expect(
        service.createCampaign(
          {
            name: "Bad Campaign",
            slug: "bad-campaign",
            type: "sitewide",
            startsAt: "2026-08-27T00:00:00Z",
            endsAt: "2026-08-20T00:00:00Z",
          },
          "admin-1",
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects a duplicate slug", async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign());

      await expect(
        service.createCampaign(
          {
            name: "Flash Sale",
            slug: "flash-sale",
            type: "sitewide",
            startsAt: "2026-08-20T00:00:00Z",
            endsAt: "2026-08-27T00:00:00Z",
          },
          "admin-1",
        ),
      ).rejects.toThrow(ConflictError);
    });
  });
});
