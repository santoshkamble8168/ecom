import { PERMISSIONS } from "@ecom/types";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { AdjustLoyaltyPointsDto } from "./dto/adjust-loyalty-points.dto";
import { CreateGiftCardDto } from "./dto/create-gift-card.dto";
import { MarketingPaginationQueryDto } from "./dto/pagination-query.dto";
import { MarketingService } from "./marketing.service";

@ApiTags("admin-marketing")
@Permissions(PERMISSIONS.ADMIN_ACCESS)
@Controller("admin/marketing")
export class MarketingAdminController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get("referrals")
  listReferrals(@Query() query: MarketingPaginationQueryDto) {
    return this.marketingService.adminListReferrals(query);
  }

  @Get("gift-cards")
  listGiftCards(@Query() query: MarketingPaginationQueryDto) {
    return this.marketingService.adminListGiftCards(query);
  }

  @Post("gift-cards")
  createGiftCard(@Body() dto: CreateGiftCardDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.marketingService.adminCreateGiftCard(dto, admin.id);
  }

  @Get("loyalty/:userId")
  getLoyaltyAccount(@Param("userId") userId: string) {
    return this.marketingService.adminGetLoyaltyAccount(userId);
  }

  @Post("loyalty/:userId/adjust")
  adjustLoyaltyPoints(
    @Param("userId") userId: string,
    @Body() dto: AdjustLoyaltyPointsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.marketingService.adminAdjustLoyaltyPoints(userId, dto, admin.id);
  }
}
