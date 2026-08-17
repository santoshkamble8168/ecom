import { Get, Query, Controller, Header, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";
import type { Response } from "express";

import { Permissions } from "../common/decorators/permissions.decorator";

import { AuditLogsService } from "./audit-logs.service";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";

@ApiTags("admin-audit-logs")
@Controller("admin/audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions(PERMISSIONS.AUDIT_READ)
  list(@Query() query: ListAuditLogsQueryDto) {
    return this.auditLogsService.list(query);
  }

  @Get("export")
  @Permissions(PERMISSIONS.AUDIT_EXPORT)
  @Header("Content-Type", "text/csv")
  async export(@Query() query: ListAuditLogsQueryDto, @Res() res: Response) {
    const csv = await this.auditLogsService.exportCsv(query);
    res.setHeader("Content-Disposition", "attachment; filename=\"audit-logs.csv\"");
    res.send(csv);
  }
}
