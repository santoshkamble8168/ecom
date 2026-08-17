import { mkdir, unlink, writeFile } from "fs/promises";

import type { PrismaService } from "../prisma/prisma.service";

import { AdminJobsService } from "./admin-jobs.service";
import { csvEscape, toCsv } from "./csv";
import { buildReportCsv } from "./report-csv";

jest.mock("fs/promises", () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

function mockPrisma() {
  return {
    exportJob: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    reportDefinition: { findUnique: jest.fn() },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    stockItem: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    product: { findMany: jest.fn().mockResolvedValue([]) },
    searchLog: { findMany: jest.fn().mockResolvedValue([]) },
    couponUsage: { findMany: jest.fn().mockResolvedValue([]) },
    campaign: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    scheduledJobRun: { create: jest.fn().mockResolvedValue({}) },
  };
}

type MockPrisma = ReturnType<typeof mockPrisma>;

describe("csv helpers", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
    expect(csvEscape(null)).toBe("");
  });

  it("writes a header row plus data rows", () => {
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe("a,b\n1,2\n");
  });
});

describe("buildReportCsv", () => {
  it("exports paid orders for sales reports", async () => {
    const prisma = mockPrisma();
    prisma.order.findMany.mockResolvedValue([
      {
        orderNumber: "ECO1",
        status: "confirmed",
        total: { toString: () => "999.00" },
        currency: "INR",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    const { csv, rowCount } = await buildReportCsv(prisma as unknown as PrismaService, "sales");

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { notIn: ["pending_payment", "cancelled", "failed"] } },
      }),
    );
    expect(rowCount).toBe(1);
    expect(csv).toContain("orderNumber,status,total,currency,createdAt");
    expect(csv).toContain("ECO1,confirmed,999.00,INR,2026-01-01T00:00:00.000Z");
  });

  it("aggregates line items for product_performance", async () => {
    const prisma = mockPrisma();
    prisma.order.findMany.mockResolvedValue([
      {
        orderNumber: "ECO1",
        lineItems: [
          { variantSku: "CCN-BLK-M", quantity: 2, unitPrice: "10.00", product: { title: "Tee" } },
        ],
      },
      {
        orderNumber: "ECO2",
        lineItems: [
          { variantSku: "CCN-BLK-M", quantity: 1, unitPrice: "10.00", product: { title: "Tee" } },
        ],
      },
    ]);

    const { csv, rowCount } = await buildReportCsv(prisma as unknown as PrismaService, "product_performance");

    expect(rowCount).toBe(1);
    expect(csv).toContain("CCN-BLK-M,Tee,3,30.00");
  });
});

describe("AdminJobsService", () => {
  let prisma: MockPrisma;
  let service: AdminJobsService;
  const originalExportPath = process.env.EXPORT_STORAGE_PATH;
  const originalRetention = process.env.REPORT_RETENTION_DAYS;
  const originalAuditRetention = process.env.AUDIT_RETENTION_DAYS;

  beforeEach(() => {
    prisma = mockPrisma();
    service = new AdminJobsService(prisma as unknown as PrismaService);
    process.env.EXPORT_STORAGE_PATH = "/tmp/exports";
    process.env.REPORT_RETENTION_DAYS = "14";
    process.env.AUDIT_RETENTION_DAYS = "365";
    mkdirMock.mockReset().mockResolvedValue(undefined);
    writeFileMock.mockReset().mockResolvedValue(undefined);
    unlinkMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    restoreEnv("EXPORT_STORAGE_PATH", originalExportPath);
    restoreEnv("REPORT_RETENTION_DAYS", originalRetention);
    restoreEnv("AUDIT_RETENTION_DAYS", originalAuditRetention);
  });

  it("writes a CSV and marks queued export jobs completed", async () => {
    prisma.exportJob.findMany.mockResolvedValue([
      { id: "job-1", reportId: "report-sales", status: "queued", createdAt: new Date() },
    ]);
    prisma.reportDefinition.findUnique.mockResolvedValue({ id: "report-sales", kind: "sales" });
    prisma.order.findMany.mockResolvedValue([
      {
        orderNumber: "ECO1",
        status: "confirmed",
        total: "100.00",
        currency: "INR",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    await service.processQueuedExports();

    expect(prisma.exportJob.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "running" }),
      }),
    );
    expect(mkdirMock).toHaveBeenCalledWith("/tmp/exports", { recursive: true });
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/job-1\.csv$/),
      expect.stringContaining("ECO1"),
      "utf8",
    );
    expect(prisma.exportJob.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({
          status: "completed",
          rowCount: 1,
          filePath: expect.stringMatching(/job-1\.csv$/),
        }),
      }),
    );
    expect(prisma.scheduledJobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobKey: "report.export",
          status: "completed",
        }),
      }),
    );
  });

  it("marks a job failed and truncates the error message", async () => {
    prisma.exportJob.findMany.mockResolvedValue([
      { id: "job-2", reportId: "missing", status: "queued", createdAt: new Date() },
    ]);
    prisma.reportDefinition.findUnique.mockResolvedValue(null);

    await service.processQueuedExports();

    expect(prisma.exportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-2" },
        data: expect.objectContaining({
          status: "failed",
          errorMessage: expect.stringMatching(/^ReportDefinition missing not found$/),
        }),
      }),
    );
    expect(prisma.scheduledJobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jobKey: "report.export", status: "failed" }),
      }),
    );
  });

  it("skips work when no export jobs are queued", async () => {
    prisma.exportJob.findMany.mockResolvedValue([]);
    await service.processQueuedExports();
    expect(prisma.exportJob.update).not.toHaveBeenCalled();
    expect(prisma.scheduledJobRun.create).not.toHaveBeenCalled();
  });

  it("deletes expired audit logs and unlinks finished export files", async () => {
    prisma.auditLog.findMany
      .mockResolvedValueOnce([{ id: "audit-1" }])
      .mockResolvedValueOnce([]);
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 1 });
    prisma.exportJob.findMany.mockResolvedValue([
      { id: "exp-1", filePath: "/tmp/exports/exp-1.csv" },
    ]);
    prisma.exportJob.deleteMany.mockResolvedValue({ count: 1 });

    await service.archiveExpiredAuditLogs();

    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["audit-1"] } },
    });
    expect(unlinkMock).toHaveBeenCalledWith("/tmp/exports/exp-1.csv");
    expect(prisma.exportJob.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["exp-1"] } },
    });
    expect(prisma.scheduledJobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobKey: "audit.retention",
          status: "completed",
          message: "auditLogs=1 exportJobs=1",
        }),
      }),
    );
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
