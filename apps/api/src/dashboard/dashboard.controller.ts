import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import { Permissions } from "../common/decorators/permissions.decorator";

import { DashboardService } from "./dashboard.service";

@ApiTags("admin-dashboard")
@Controller("admin")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("dashboard")
  @Permissions(PERMISSIONS.DASHBOARD_READ)
  getDashboard(@Query("from") from?: string, @Query("to") to?: string) {
    return this.dashboardService.getSnapshot(from, to);
  }
}
