import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";

import { RecommendationEventDto } from "./dto/recommendation-event.dto";
import { RecommendationQueryDto } from "./dto/recommendation-query.dto";
import { RecommendationsService } from "./recommendations.service";

@ApiTags("recommendations")
@SkipThrottle()
@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Public()
  @Get()
  listSlots() {
    return this.recommendations.listPublicSlots();
  }

  @Get("profile")
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.recommendations.getProfile(user.id);
  }

  @Public()
  @Post("events")
  @HttpCode(HttpStatus.ACCEPTED)
  recordEvent(@Body() dto: RecommendationEventDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.recommendations.recordEvent(dto, user?.id);
  }

  @Public()
  @Get(":slot")
  getSlot(
    @Param("slot") slot: string,
    @Query() query: RecommendationQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.recommendations.getSlot(slot, {
      productSlug: query.productSlug,
      sessionId: query.sessionId,
      userId: user?.id,
    });
  }
}
