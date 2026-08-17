import { ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { SettingsService } from "./settings.service";

function baseSetting(overrides: Record<string, unknown> = {}) {
  return {
    id: "set-1",
    key: "store.name",
    value: "ECOM",
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

describe("SettingsService", () => {
  let service: SettingsService;
  let prisma: {
    setting: { findMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      setting: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue(baseSetting()),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new SettingsService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  describe("patch", () => {
    it("rejects unknown keys with ValidationError", async () => {
      await expect(service.patch("admin-1", { "store.unknown": "x" })).rejects.toThrow(ValidationError);
      expect(prisma.setting.upsert).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("rejects invalid types for allowlisted keys", async () => {
      await expect(service.patch("admin-1", { "store.maintenanceMode": "yes" })).rejects.toThrow(
        ValidationError,
      );
      await expect(service.patch("admin-1", { "store.currency": "IN" })).rejects.toThrow(ValidationError);
      await expect(service.patch("admin-1", { "store.name": "" })).rejects.toThrow(ValidationError);
    });

    it("upserts valid keys and audits only changed values", async () => {
      prisma.setting.findMany
        .mockResolvedValueOnce([baseSetting({ value: "Old Store" })])
        .mockResolvedValueOnce([baseSetting({ value: "New Store" })]);

      const result = await service.patch("admin-1", { "store.name": "New Store" });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "store.name" },
          update: { value: "New Store" },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-1",
          action: "settings.updated",
          before: { "store.name": "Old Store" },
          after: { "store.name": "New Store" },
        }),
      );
      expect(result[0]?.value).toBe("New Store");
    });
  });
});
