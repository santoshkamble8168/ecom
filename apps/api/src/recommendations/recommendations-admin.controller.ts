import { PERMISSIONS } from "@ecom/types";
import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { UpdateRecommendationSlotDto } from "./dto/update-slot.dto";
import { RecommendationsService } from "./recommendations.service";

@ApiTags("admin-recommendations")
@Controller("admin/recommendations")
export class RecommendationsAdminController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get("slots")
  @Permissions(PERMISSIONS.RECOMMENDATION_READ)
  listSlots() {
    return this.recommendations.listAdminSlots();
  }

  @Patch("slots/:slot")
  @Permissions(PERMISSIONS.RECOMMENDATION_WRITE)
  updateSlot(
    @Param("slot") slot: string,
    @Body() dto: UpdateRecommendationSlotDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.recommendations.updateSlot(admin.id, slot, dto);
  }
}
