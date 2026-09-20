import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";

import { ContactMessageDto } from "./dto/contact-message.dto";
import { NewsletterSubscribeDto } from "./dto/newsletter-subscribe.dto";
import { StorefrontService } from "./storefront.service";

@ApiTags("storefront")
@Controller()
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Public()
  @SkipThrottle()
  @Get("home")
  getHome() {
    return this.storefrontService.getHomepage();
  }

  @Public()
  @SkipThrottle()
  @Get("navigation")
  getNavigation() {
    return this.storefrontService.getNavigation();
  }

  @Public()
  @SkipThrottle()
  @Get("search/suggestions")
  getSuggestions(@Query("q") query = "") {
    return this.storefrontService.getSearchSuggestions(query);
  }

  @Public()
  @SkipThrottle()
  @Get("search/trending")
  getTrending() {
    return this.storefrontService.getTrendingSearches();
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("newsletter/subscribe")
  @HttpCode(HttpStatus.OK)
  subscribe(@Body() dto: NewsletterSubscribeDto) {
    return this.storefrontService.subscribeNewsletter(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("contact")
  @HttpCode(HttpStatus.OK)
  contact(@Body() dto: ContactMessageDto) {
    return this.storefrontService.submitContact(dto);
  }
}
