import { NotFoundError, ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { PricingService } from "./pricing.service";

function decimal(value: string) {
  return { toString: () => value, valueOf: () => Number(value) };
}

describe("PricingService", () => {
  let service: PricingService;
  let prisma: {
    priceList: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    productPrice: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    priceHistory: { findMany: jest.Mock; create: jest.Mock };
    taxRule: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    coupon: { findUnique: jest.Mock };
    productVariant: { findUnique: jest.Mock };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      priceList: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      productPrice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      priceHistory: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({}) },
      taxRule: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      coupon: { findUnique: jest.fn() },
      productVariant: { findUnique: jest.fn() },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new PricingService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  describe("upsertPrice", () => {
    const baseDto = { mrp: "999.00", sellingPrice: "799.00" };

    it("creates a new ProductPrice and writes price history with null old values", async () => {
      const newMrp = decimal("999.00");
      const newSellingPrice = decimal("799.00");
      prisma.priceList.findFirst.mockResolvedValue({ id: "pl-1" });
      prisma.productPrice.findUnique.mockResolvedValue(null);
      prisma.productPrice.create.mockResolvedValue({
        id: "pp-1",
        priceListId: "pl-1",
        variantSku: "SKU-1",
        mrp: newMrp,
        sellingPrice: newSellingPrice,
        salePrice: null,
        saleStartsAt: null,
        saleEndsAt: null,
        isActive: true,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      const result = await service.upsertPrice("SKU-1", baseDto, "admin-1");

      expect(prisma.productPrice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priceListId: "pl-1", variantSku: "SKU-1", mrp: "999.00", sellingPrice: "799.00" }),
        }),
      );
      expect(prisma.priceHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productPriceId: "pp-1",
            variantSku: "SKU-1",
            oldMrp: null,
            newMrp,
            oldSellingPrice: null,
            newSellingPrice,
            changedBy: "admin-1",
          }),
        }),
      );
      expect(result.effectivePrice).toBe("799.00");
      expect(audit.log).toHaveBeenCalled();
    });

    it("updates an existing ProductPrice and writes price history with the previous old values", async () => {
      const oldMrp = decimal("899.00");
      const oldSellingPrice = decimal("699.00");
      const newMrp = decimal("999.00");
      const newSellingPrice = decimal("799.00");
      prisma.priceList.findFirst.mockResolvedValue({ id: "pl-1" });
      prisma.productPrice.findUnique.mockResolvedValue({
        id: "pp-1",
        priceListId: "pl-1",
        variantSku: "SKU-1",
        mrp: oldMrp,
        sellingPrice: oldSellingPrice,
      });
      prisma.productPrice.update.mockResolvedValue({
        id: "pp-1",
        priceListId: "pl-1",
        variantSku: "SKU-1",
        mrp: newMrp,
        sellingPrice: newSellingPrice,
        salePrice: null,
        saleStartsAt: null,
        saleEndsAt: null,
        isActive: true,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      await service.upsertPrice("SKU-1", baseDto, "admin-1");

      expect(prisma.productPrice.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "pp-1" } }),
      );
      expect(prisma.priceHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            oldMrp,
            newMrp,
            oldSellingPrice,
            newSellingPrice,
          }),
        }),
      );
    });

    it("rejects when salePrice is not less than sellingPrice", async () => {
      await expect(
        service.upsertPrice("SKU-1", { ...baseDto, salePrice: "899.00" }, "admin-1"),
      ).rejects.toThrow(ValidationError);
      expect(prisma.productPrice.create).not.toHaveBeenCalled();
    });

    it("rejects when saleStartsAt is not before saleEndsAt", async () => {
      await expect(
        service.upsertPrice(
          "SKU-1",
          { ...baseDto, saleStartsAt: "2026-06-10T00:00:00Z", saleEndsAt: "2026-06-01T00:00:00Z" },
          "admin-1",
        ),
      ).rejects.toThrow(ValidationError);
      expect(prisma.productPrice.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when no priceListId is given and there is no default price list", async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      await expect(service.upsertPrice("SKU-1", baseDto, "admin-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("simulate", () => {
    function mockVariant(categoryId: string | null) {
      prisma.productVariant.findUnique.mockResolvedValue({
        sku: "SKU-1",
        price: decimal("500.00"),
        compareAtPrice: null,
        product: {
          categories: categoryId ? [{ categoryId, category: { id: categoryId, name: "Tees" } }] : [],
        },
      });
    }

    it("applies a percent coupon correctly", async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);
      mockVariant(null);
      prisma.taxRule.findMany.mockResolvedValue([]);
      prisma.coupon.findUnique.mockResolvedValue({
        code: "WELCOME10",
        type: "percent",
        value: decimal("10"),
        isActive: true,
        expiresAt: null,
      });

      const result = await service.simulate({ variantSku: "SKU-1", quantity: 2, couponCode: "WELCOME10" });

      // subtotal = 500 * 2 = 1000, discount = 10% = 100
      expect(result.subtotal).toBe("1000.00");
      expect(result.discount).toBe("100.00");
      expect(result.couponApplied).toBe("WELCOME10");
      expect(result.taxAmount).toBe("0.00");
      expect(result.total).toBe("900.00");
    });

    it("resolves the category-specific tax rate over the sitewide fallback", async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);
      mockVariant("cat-1");
      prisma.taxRule.findMany.mockResolvedValue([
        { id: "r1", rate: decimal("0.05"), categoryId: null, priority: 0, isActive: true },
        { id: "r2", rate: decimal("0.18"), categoryId: "cat-1", priority: 5, isActive: true },
      ]);

      const result = await service.simulate({ variantSku: "SKU-1", quantity: 1 });

      // subtotal = 500, taxRate = 0.18 -> taxAmount = 90
      expect(result.taxRate).toBe("0.18");
      expect(result.taxAmount).toBe("90.00");
      expect(result.total).toBe("590.00");
      expect(result.couponApplied).toBeNull();
    });

    it("throws NotFoundError when the variant does not exist", async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.simulate({ variantSku: "UNKNOWN" })).rejects.toThrow(NotFoundError);
    });

    it("rejects an invalid coupon code", async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);
      mockVariant(null);
      prisma.taxRule.findMany.mockResolvedValue([]);
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.simulate({ variantSku: "SKU-1", couponCode: "BOGUS" })).rejects.toThrow(ValidationError);
    });
  });

  describe("getEffectivePrice", () => {
    it("returns null when there is no ProductPrice row for the variant", async () => {
      prisma.priceList.findFirst.mockResolvedValue({ id: "pl-1" });
      prisma.productPrice.findUnique.mockResolvedValue(null);

      const result = await service.getEffectivePrice("SKU-1");

      expect(result).toBeNull();
    });

    it("returns null when there is no default price list and none was given", async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      const result = await service.getEffectivePrice("SKU-1");

      expect(result).toBeNull();
      expect(prisma.productPrice.findUnique).not.toHaveBeenCalled();
    });
  });
});
