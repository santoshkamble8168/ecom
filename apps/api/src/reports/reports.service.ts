import type { ApiEnv } from "@ecom/config";
import { NotFoundError } from "@ecom/shared";
import type { ExportJobStatus, ExportJobSummary, ReportDefinitionSummary, ReportKind } from "@ecom/types";
import { Inject, Injectable } from "@nestjs/common";
import type {
  ExportJob as ExportJobModel,
  Prisma,
  ReportDefinition as ReportDefinitionModel,
} from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { APP_ENV } from "../config/config.module";
import { PrismaService } from "../prisma/prisma.service";

import type { ExportReportDto } from "./dto/export-report.dto";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  async list(): Promise<ReportDefinitionSummary[]> {
    const reports = await this.prisma.reportDefinition.findMany({
      orderBy: { name: "asc" },
    });
    return reports.map((report) => this.toDefinitionSummary(report));
  }

  async getByType(type: string): Promise<ReportDefinitionSummary> {
    const report = await this.findReport(type);
    if (!report) throw new NotFoundError("Report not found");
    return this.toDefinitionSummary(report);
  }

  async queueExport(actorId: string, reportId: string, dto: ExportReportDto): Promise<ExportJobSummary> {
    const report = await this.findReport(reportId);
    if (!report) throw new NotFoundError("Report not found");

    const format = dto.format ?? "csv";
    const params = dto.params ?? {};
    const expiresAt = new Date(Date.now() + this.env.REPORT_RETENTION_DAYS * MS_PER_DAY);

    const job = await this.prisma.exportJob.create({
      data: {
        reportId: report.id,
        requestedById: actorId,
        status: "queued",
        format,
        params: params as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: "report.export_queued",
      entityType: "report",
      entityId: report.id,
      metadata: { exportJobId: job.id, format, reportSlug: report.slug },
    });

    return this.toExportSummary(job, report.slug);
  }

  async getExport(id: string): Promise<ExportJobSummary> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id },
      include: { report: { select: { slug: true } } },
    });
    if (!job) throw new NotFoundError("Export job not found");
    return this.toExportSummary(job, job.report.slug);
  }

  private async findReport(idOrSlug: string): Promise<ReportDefinitionModel | null> {
    const byId = await this.prisma.reportDefinition.findUnique({ where: { id: idOrSlug } });
    if (byId) return byId;
    return this.prisma.reportDefinition.findUnique({ where: { slug: idOrSlug } });
  }

  private toDefinitionSummary(report: ReportDefinitionModel): ReportDefinitionSummary {
    return {
      id: report.id,
      slug: report.slug,
      name: report.name,
      kind: report.kind as ReportKind,
      description: report.description,
    };
  }

  private toExportSummary(job: ExportJobModel, reportSlug: string): ExportJobSummary {
    return {
      id: job.id,
      reportId: job.reportId,
      reportSlug,
      status: job.status as ExportJobStatus,
      format: job.format,
      rowCount: job.rowCount,
      filePath: job.filePath,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      expiresAt: job.expiresAt?.toISOString() ?? null,
    };
  }
}
