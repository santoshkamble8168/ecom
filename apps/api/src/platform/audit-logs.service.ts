import { paginationSkip } from "@ecom/shared";
import type { AuditLogEntry, AuditLogListResult } from "@ecom/types";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import type { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";

const CSV_HEADER = "id,createdAt,actorEmail,action,entityType,entityId,correlationId,ipAddress";
const CSV_EXPORT_MAX_ROWS = 10_000;

const AUDIT_USER_SELECT = { user: { select: { email: true } } } satisfies Prisma.AuditLogInclude;

type AuditLogWithActor = Prisma.AuditLogGetPayload<{ include: typeof AUDIT_USER_SELECT }>;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAuditLogsQueryDto): Promise<AuditLogListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: AUDIT_USER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);

    return {
      logs: rows.map((row) => this.toEntry(row)),
      total,
      page,
      pageSize,
    };
  }

  async exportCsv(query: ListAuditLogsQueryDto): Promise<string> {
    const rows = await this.prisma.auditLog.findMany({
      where: this.buildWhere(query),
      include: AUDIT_USER_SELECT,
      orderBy: { createdAt: "desc" },
      take: CSV_EXPORT_MAX_ROWS,
    });

    const lines = [CSV_HEADER, ...rows.map((row) => this.toCsvRow(row))];
    return lines.join("\n");
  }

  private buildWhere(query: ListAuditLogsQueryDto): Prisma.AuditLogWhereInput {
    const createdAt: Prisma.DateTimeFilter = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };

    return {
      ...(query.actorId ? { userId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.correlationId ? { requestId: query.correlationId } : {}),
      ...(query.from || query.to ? { createdAt } : {}),
    };
  }

  private toEntry(row: AuditLogWithActor): AuditLogEntry {
    return {
      id: row.id,
      actorId: row.userId,
      actorEmail: row.user?.email ?? null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: row.metadata,
      correlationId: row.requestId,
      ipAddress: row.ipAddress,
      before: row.before,
      after: row.after,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toCsvRow(row: AuditLogWithActor): string {
    return [
      csvCell(row.id),
      csvCell(row.createdAt.toISOString()),
      csvCell(row.user?.email ?? null),
      csvCell(row.action),
      csvCell(row.entityType),
      csvCell(row.entityId),
      csvCell(row.requestId),
      csvCell(row.ipAddress),
    ].join(",");
  }
}

function csvCell(value: string | null | undefined): string {
  const raw = value ?? "";
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}
