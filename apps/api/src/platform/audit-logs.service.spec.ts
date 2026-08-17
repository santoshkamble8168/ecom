import type { PrismaService } from "../prisma/prisma.service";

import { AuditLogsService } from "./audit-logs.service";

function baseLog(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    userId: "user-1",
    action: "settings.updated",
    entityType: "settings",
    entityId: null,
    metadata: null,
    requestId: "corr-abc",
    ipAddress: "127.0.0.1",
    before: { "store.name": "Old" },
    after: { "store.name": "ECOM" },
    createdAt: new Date("2026-08-01T10:00:00Z"),
    user: { email: "admin@example.com" },
    ...overrides,
  };
}

describe("AuditLogsService", () => {
  let service: AuditLogsService;
  let prisma: {
    auditLog: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new AuditLogsService(prisma as unknown as PrismaService);
  });

  describe("list", () => {
    it("maps correlationId to requestId", async () => {
      await service.list({ correlationId: "corr-abc", page: 1, pageSize: 20 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requestId: "corr-abc" }),
        }),
      );
      expect(prisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requestId: "corr-abc" }),
        }),
      );
    });

    it("maps actorId to userId and uses contains for action", async () => {
      await service.list({ actorId: "user-1", action: "settings", entityType: "settings" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            entityType: "settings",
            action: { contains: "settings", mode: "insensitive" },
          }),
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("maps rows to AuditLogEntry with actor email and ISO timestamps", async () => {
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue([baseLog()]);

      const result = await service.list({});

      expect(result.total).toBe(1);
      expect(result.logs[0]).toMatchObject({
        id: "log-1",
        actorId: "user-1",
        actorEmail: "admin@example.com",
        correlationId: "corr-abc",
        createdAt: "2026-08-01T10:00:00.000Z",
      });
    });
  });

  describe("exportCsv", () => {
    it("includes the CSV header", async () => {
      const csv = await service.exportCsv({});

      expect(csv.split("\n")[0]).toBe(
        "id,createdAt,actorEmail,action,entityType,entityId,correlationId,ipAddress",
      );
    });

    it("applies the same correlationId → requestId filter and caps at 10_000 rows", async () => {
      await service.exportCsv({ correlationId: "corr-abc" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requestId: "corr-abc" }),
          take: 10_000,
        }),
      );
    });

    it("escapes quotes in CSV cells", async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        baseLog({ user: { email: 'say "hi"@example.com' } }),
      ]);

      const csv = await service.exportCsv({});
      const dataRow = csv.split("\n")[1];

      expect(dataRow).toContain('"say ""hi""@example.com"');
    });
  });
});
