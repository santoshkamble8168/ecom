import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";

import { MarketingService } from "./marketing.service";

@ApiTags("marketing")
@SkipThrottle()
@Controller()
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get("me/referral-code")
  getReferralCode(@CurrentUser() user: AuthenticatedUser) {
    return this.marketingService.getOrCreateReferralCode(user.id);
  }

  @Get("me/loyalty")
  getLoyaltyAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.marketingService.getOrCreateLoyaltyAccount(user.id);
  }
}
