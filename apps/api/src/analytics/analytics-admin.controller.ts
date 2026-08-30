import { PERMISSIONS } from "@ecom/types";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { Permissions } from "../common/decorators/permissions.decorator";

import { AnalyticsRangeQueryDto } from "./dto/analytics-range-query.dto";
import { AnalyticsService } from "./analytics.service";

@ApiTags("admin-analytics")
@Controller("admin/analytics")
export class AnalyticsAdminController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("kpis")
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  kpis(@Query() query: AnalyticsRangeQueryDto) {
    return this.analytics.getKpis(query.from, query.to);
  }

  @Get("funnels")
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  funnels(@Query() query: AnalyticsRangeQueryDto) {
    return this.analytics.getFunnels(query.from, query.to);
  }

  @Get("search")
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  search(@Query() query: AnalyticsRangeQueryDto) {
    return this.analytics.getSearch(query.from, query.to);
  }

  @Get("products")
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  products(@Query() query: AnalyticsRangeQueryDto) {
    return this.analytics.getProducts(query.from, query.to);
  }

  @Get("cohorts")
  @Permissions(PERMISSIONS.ANALYTICS_READ)
  cohorts(@Query() query: AnalyticsRangeQueryDto) {
    return this.analytics.getCohorts(query.from, query.to);
  }
}
