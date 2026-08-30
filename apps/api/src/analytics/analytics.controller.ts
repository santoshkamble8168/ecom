import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";

import { IngestAnalyticsEventsDto } from "./dto/ingest-events.dto";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@SkipThrottle()
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Post("events")
  @HttpCode(HttpStatus.ACCEPTED)
  ingest(@Body() dto: IngestAnalyticsEventsDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.analytics.ingest(dto.events, user?.id, "client");
  }
}
