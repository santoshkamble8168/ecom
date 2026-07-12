import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";

import { NewsletterSubscribeDto } from "./dto/newsletter-subscribe.dto";
import { StorefrontService } from "./storefront.service";

@ApiTags("storefront")
@SkipThrottle()
@Controller()
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Public()
  @Get("home")
  getHome() {
    return this.storefrontService.getHomepage();
  }

  @Public()
  @Get("navigation")
  getNavigation() {
    return this.storefrontService.getNavigation();
  }

  @Public()
  @Get("search/suggestions")
  getSuggestions(@Query("q") query = "") {
    return this.storefrontService.getSearchSuggestions(query);
  }

  @Public()
  @Get("search/trending")
  getTrending() {
    return this.storefrontService.getTrendingSearches();
  }

  @Public()
  @Post("newsletter/subscribe")
  @HttpCode(HttpStatus.OK)
  subscribe(@Body() dto: NewsletterSubscribeDto) {
    return this.storefrontService.subscribeNewsletter(dto);
  }
}
