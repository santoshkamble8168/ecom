import type { ApiEnv } from "@ecom/config";
import { NotFoundError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { ReportsService } from "./reports.service";

function baseReport(overrides: Record<string, unknown> = {}) {
  return {
    id: "report-sales",
    slug: "sales",
    name: "Sales",
    kind: "sales",
    description: "Confirmed order revenue",
    defaultParams: {},
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

function baseJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    reportId: "report-sales",
    requestedById: "admin-1",
    status: "queued",
    format: "csv",
    params: {},
    filePath: null,
    errorMessage: null,
    rowCount: null,
    createdAt: new Date("2026-08-17T12:00:00Z"),
    startedAt: null,
    completedAt: null,
    expiresAt: new Date("2026-08-31T12:00:00Z"),
    ...overrides,
  };
}

describe("ReportsService", () => {
  let service: ReportsService;
  let prisma: {
    reportDefinition: { findMany: jest.Mock; findUnique: jest.Mock };
    exportJob: { create: jest.Mock; findUnique: jest.Mock };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      reportDefinition: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      exportJob: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new ReportsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      { REPORT_RETENTION_DAYS: 14 } as unknown as ApiEnv,
    );
  });

  describe("list", () => {
    it("returns report definitions ordered by name", async () => {
      prisma.reportDefinition.findMany.mockResolvedValue([baseReport()]);

      const result = await service.list();

      expect(prisma.reportDefinition.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
      expect(result[0]).toMatchObject({ id: "report-sales", slug: "sales", kind: "sales" });
    });
  });

  describe("queueExport", () => {
    it("throws NotFoundError when the report is missing", async () => {
      prisma.reportDefinition.findUnique.mockResolvedValue(null);

      await expect(service.queueExport("admin-1", "missing", {})).rejects.toThrow(NotFoundError);
      expect(prisma.exportJob.create).not.toHaveBeenCalled();
    });

    it("creates a queued export job and does not write files", async () => {
      prisma.reportDefinition.findUnique.mockResolvedValueOnce(baseReport());
      prisma.exportJob.create.mockResolvedValue(baseJob());

      const result = await service.queueExport("admin-1", "report-sales", { format: "csv" });

      expect(prisma.exportJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportId: "report-sales",
            requestedById: "admin-1",
            status: "queued",
            format: "csv",
          }),
        }),
      );
      expect(result.status).toBe("queued");
      expect(result.reportSlug).toBe("sales");
      expect(result.filePath).toBeNull();
      expect(result.rowCount).toBeNull();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "report.export_queued" }),
      );
    });

    it("falls back to slug lookup when id is not found", async () => {
      prisma.reportDefinition.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseReport());
      prisma.exportJob.create.mockResolvedValue(baseJob());

      await service.queueExport("admin-1", "sales", {});

      expect(prisma.reportDefinition.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: "sales" },
      });
      expect(prisma.reportDefinition.findUnique).toHaveBeenNthCalledWith(2, {
        where: { slug: "sales" },
      });
    });
  });

  describe("getExport", () => {
    it("throws NotFoundError when the job is missing", async () => {
      prisma.exportJob.findUnique.mockResolvedValue(null);

      await expect(service.getExport("missing")).rejects.toThrow(NotFoundError);
    });
  });
});
