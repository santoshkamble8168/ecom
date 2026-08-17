import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service";

import { buildReportCsv } from "./report-csv";

const DEFAULT_REPORT_RETENTION_DAYS = 14;
const DEFAULT_AUDIT_RETENTION_DAYS = 365;
const EXPORT_BATCH_SIZE = 5;
const AUDIT_DELETE_BATCH = 2000;

/**
 * Sprint 12 — process queued report exports and archive old audit rows.
 */
@Injectable()
export class AdminJobsService {
  private readonly logger = new Logger(AdminJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processQueuedExports(): Promise<void> {
    const jobs = await this.prisma.exportJob.findMany({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
      take: EXPORT_BATCH_SIZE,
    });
    if (jobs.length === 0) return;

    let completed = 0;
    let failed = 0;

    for (const job of jobs) {
      const startedAt = new Date();
      try {
        await this.prisma.exportJob.update({
          where: { id: job.id },
          data: { status: "running", startedAt },
        });

        const report = await this.prisma.reportDefinition.findUnique({
          where: { id: job.reportId },
        });
        if (!report) {
          throw new Error(`ReportDefinition ${job.reportId} not found`);
        }

        const { csv, rowCount } = await buildReportCsv(this.prisma, report.kind);

        const dir = process.env.EXPORT_STORAGE_PATH ?? "./tmp/exports";
        await mkdir(dir, { recursive: true });
        const filePath = join(dir, `${job.id}.csv`);
        await writeFile(filePath, csv, "utf8");

        const completedAt = new Date();
        const retentionDays = Number(process.env.REPORT_RETENTION_DAYS) || DEFAULT_REPORT_RETENTION_DAYS;
        const expiresAt = new Date(completedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);

        await this.prisma.exportJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            filePath,
            rowCount,
            completedAt,
            expiresAt,
            errorMessage: null,
          },
        });
        completed += 1;
      } catch (err) {
        failed += 1;
        const message = truncateError(err);
        this.logger.error(`Export job ${job.id} failed: ${message}`, err instanceof Error ? err.stack : undefined);
        await this.prisma.exportJob
          .update({
            where: { id: job.id },
            data: {
              status: "failed",
              errorMessage: message,
              completedAt: new Date(),
            },
          })
          .catch((updateErr: unknown) => {
            this.logger.error(
              `Failed to mark export job ${job.id} as failed`,
              updateErr instanceof Error ? updateErr.stack : undefined,
            );
          });
      }
    }

    this.logger.log(`Report exports processed=${jobs.length} completed=${completed} failed=${failed}`);
    await this.recordRun(
      "report.export",
      failed > 0 ? "failed" : "completed",
      `processed=${jobs.length} completed=${completed} failed=${failed}`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archiveExpiredAuditLogs(): Promise<void> {
    try {
      const now = new Date();
      const auditRetentionDays = Number(process.env.AUDIT_RETENTION_DAYS) || DEFAULT_AUDIT_RETENTION_DAYS;
      const reportRetentionDays = Number(process.env.REPORT_RETENTION_DAYS) || DEFAULT_REPORT_RETENTION_DAYS;
      const auditCutoff = new Date(now.getTime() - auditRetentionDays * 24 * 60 * 60 * 1000);
      const reportCutoff = new Date(now.getTime() - reportRetentionDays * 24 * 60 * 60 * 1000);

      const auditDeleted = await this.deleteExpiredAuditLogs(auditCutoff);
      const exportsDeleted = await this.deleteExpiredExportJobs(now, reportCutoff);

      this.logger.log(`Retention archived auditLogs=${auditDeleted} exportJobs=${exportsDeleted}`);
      await this.recordRun(
        "audit.retention",
        "completed",
        `auditLogs=${auditDeleted} exportJobs=${exportsDeleted}`,
      );
    } catch (err) {
      const message = truncateError(err);
      this.logger.error(`audit.retention failed: ${message}`, err instanceof Error ? err.stack : undefined);
      await this.recordRun("audit.retention", "failed", message);
    }
  }

  private async deleteExpiredAuditLogs(cutoff: Date): Promise<number> {
    let deleted = 0;
    for (;;) {
      const batch = await this.prisma.auditLog.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take: AUDIT_DELETE_BATCH,
      });
      if (batch.length === 0) break;
      const result = await this.prisma.auditLog.deleteMany({
        where: { id: { in: batch.map((row) => row.id) } },
      });
      deleted += result.count;
      if (batch.length < AUDIT_DELETE_BATCH) break;
    }
    return deleted;
  }

  private async deleteExpiredExportJobs(now: Date, reportCutoff: Date): Promise<number> {
    const expired = await this.prisma.exportJob.findMany({
      where: {
        status: { in: ["completed", "failed"] },
        OR: [{ expiresAt: { lt: now } }, { completedAt: { lt: reportCutoff } }],
      },
      select: { id: true, filePath: true },
    });
    if (expired.length === 0) return 0;

    for (const job of expired) {
      if (!job.filePath) continue;
      try {
        await unlink(job.filePath);
      } catch (err) {
        this.logger.warn(`Could not unlink export file ${job.filePath}: ${truncateError(err)}`);
      }
    }

    const result = await this.prisma.exportJob.deleteMany({
      where: { id: { in: expired.map((job) => job.id) } },
    });
    return result.count;
  }

  private async recordRun(jobKey: string, status: string, message: string): Promise<void> {
    try {
      await this.prisma.scheduledJobRun.create({
        data: { jobKey, status, message, finishedAt: new Date() },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record ScheduledJobRun ${jobKey}: ${truncateError(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}

function truncateError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(0, 500);
}
