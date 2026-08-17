import { NotFoundError, ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { MarketingService } from "./marketing.service";

function decimal(value: string) {
  return { toString: () => value };
}

describe("MarketingService", () => {
  let service: MarketingService;
  let prisma: {
    referralCode: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; count: jest.Mock };
    loyaltyAccount: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; create: jest.Mock; update: jest.Mock };
    giftCard: { findMany: jest.Mock; create: jest.Mock; count: jest.Mock };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      referralCode: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
      loyaltyAccount: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      giftCard: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new MarketingService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  describe("getOrCreateReferralCode", () => {
    it("returns the existing code without creating a new one", async () => {
      prisma.referralCode.findUnique.mockResolvedValue({
        userId: "user-1",
        code: "ABCD1234",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });

      const result = await service.getOrCreateReferralCode("user-1");

      expect(result.code).toBe("ABCD1234");
      expect(prisma.referralCode.create).not.toHaveBeenCalled();
    });

    it("generates and retries on a code collision, then succeeds", async () => {
      prisma.referralCode.findUnique
        .mockResolvedValueOnce(null) // initial existence check
        .mockResolvedValueOnce(null); // re-check inside catch after first failed create

      prisma.referralCode.create
        .mockRejectedValueOnce(new Error("Unique constraint failed on the fields: (`code`)"))
        .mockResolvedValueOnce({
          userId: "user-1",
          code: "WXYZ5678",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        });

      const result = await service.getOrCreateReferralCode("user-1");

      expect(prisma.referralCode.create).toHaveBeenCalledTimes(2);
      expect(result.code).toBe("WXYZ5678");
    });

    it("returns the code created by a concurrent request instead of retrying", async () => {
      prisma.referralCode.findUnique
        .mockResolvedValueOnce(null) // initial existence check
        .mockResolvedValueOnce({
          userId: "user-1",
          code: "RACE0001",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        }); // re-check finds the concurrently created row

      prisma.referralCode.create.mockRejectedValueOnce(
        new Error("Unique constraint failed on the fields: (`user_id`)"),
      );

      const result = await service.getOrCreateReferralCode("user-1");

      expect(prisma.referralCode.create).toHaveBeenCalledTimes(1);
      expect(result.code).toBe("RACE0001");
    });
  });

  describe("getOrCreateLoyaltyAccount", () => {
    it("returns the existing account without creating a new one", async () => {
      prisma.loyaltyAccount.findUnique.mockResolvedValue({
        userId: "user-1",
        pointsBalance: 150,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      const result = await service.getOrCreateLoyaltyAccount("user-1");

      expect(result.pointsBalance).toBe(150);
      expect(prisma.loyaltyAccount.create).not.toHaveBeenCalled();
    });

    it("creates a new account with a zero balance when none exists", async () => {
      prisma.loyaltyAccount.findUnique.mockResolvedValue(null);
      prisma.loyaltyAccount.create.mockResolvedValue({
        userId: "user-1",
        pointsBalance: 0,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      const result = await service.getOrCreateLoyaltyAccount("user-1");

      expect(prisma.loyaltyAccount.create).toHaveBeenCalledWith({
        data: { userId: "user-1", pointsBalance: 0 },
      });
      expect(result.pointsBalance).toBe(0);
    });
  });

  describe("adminAdjustLoyaltyPoints", () => {
    it("throws NotFoundError when the account does not exist", async () => {
      prisma.loyaltyAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.adminAdjustLoyaltyPoints("user-1", { delta: 10, reason: "Goodwill" }, "admin-1"),
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects a delta that would make the balance negative", async () => {
      prisma.loyaltyAccount.findUnique.mockResolvedValue({ userId: "user-1", pointsBalance: 50 });

      await expect(
        service.adminAdjustLoyaltyPoints("user-1", { delta: -100, reason: "Correction" }, "admin-1"),
      ).rejects.toThrow(ValidationError);
      expect(prisma.loyaltyAccount.update).not.toHaveBeenCalled();
    });

    it("accepts a valid delta and logs the adjustment with the reason", async () => {
      prisma.loyaltyAccount.findUnique.mockResolvedValue({ userId: "user-1", pointsBalance: 50 });
      prisma.loyaltyAccount.update.mockResolvedValue({
        userId: "user-1",
        pointsBalance: 150,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      const result = await service.adminAdjustLoyaltyPoints(
        "user-1",
        { delta: 100, reason: "Goodwill credit" },
        "admin-1",
      );

      expect(prisma.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { pointsBalance: 150 },
      });
      expect(result.pointsBalance).toBe(150);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LoyaltyPointsAdjusted",
          userId: "admin-1",
          metadata: expect.objectContaining({ delta: 100, reason: "Goodwill credit" }),
        }),
      );
    });
  });

  describe("adminCreateGiftCard", () => {
    it("creates a gift card with balance equal to initialValue", async () => {
      prisma.giftCard.create.mockResolvedValue({
        id: "gc-1",
        code: "GIFT1234",
        initialValue: decimal("500.00"),
        balance: decimal("500.00"),
        isActive: true,
        expiresAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });

      const result = await service.adminCreateGiftCard({ initialValue: "500.00" }, "admin-1");

      expect(prisma.giftCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ initialValue: "500.00", balance: "500.00" }),
        }),
      );
      expect(result.balance).toBe("500.00");
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "GiftCardCreated" }));
    });
  });
});
