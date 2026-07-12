import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";

import { DiscoveryService } from "./discovery.service";
import { DiscoveryQueryDto } from "./dto/discovery-query.dto";
import { SearchAnalyticsDto } from "./dto/search-analytics.dto";

@ApiTags("discovery")
@SkipThrottle()
@Controller()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get("products")
  listProducts(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.listProducts(query);
  }

  @Public()
  @Get("categories/:slug/products")
  categoryProducts(@Param("slug") slug: string, @Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getCategoryProducts(slug, query);
  }

  @Public()
  @Get("collections/:slug/products")
  collectionProducts(@Param("slug") slug: string, @Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getCollectionProducts(slug, query);
  }

  @Public()
  @Get("search")
  search(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.searchProducts(query);
  }

  @Public()
  @Post("analytics/search")
  @HttpCode(HttpStatus.OK)
  logSearch(@Body() dto: SearchAnalyticsDto) {
    return this.discoveryService.logSearchAnalytics(dto);
  }
}
