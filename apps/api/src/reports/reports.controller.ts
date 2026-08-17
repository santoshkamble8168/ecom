import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { ExportReportDto } from "./dto/export-report.dto";
import { ReportsService } from "./reports.service";

@ApiTags("admin-reports")
@Controller("admin")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("reports")
  @Permissions(PERMISSIONS.REPORT_READ)
  list() {
    return this.reportsService.list();
  }

  @Post("reports/:id/export")
  @Permissions(PERMISSIONS.REPORT_EXPORT)
  export(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ExportReportDto,
  ) {
    return this.reportsService.queueExport(actor.id, id, dto);
  }

  @Get("exports/:id")
  @Permissions(PERMISSIONS.REPORT_READ)
  getExport(@Param("id") id: string) {
    return this.reportsService.getExport(id);
  }
}
