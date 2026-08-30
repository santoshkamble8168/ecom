import { Module } from "@nestjs/common";

import { AnalyticsModule } from "../analytics/analytics.module";
import { PlatformModule } from "../platform/platform.module";
import { PricingModule } from "../pricing/pricing.module";

import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { MeilisearchService } from "./meilisearch.service";

@Module({
  imports: [PricingModule, AnalyticsModule, PlatformModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, MeilisearchService],
  exports: [DiscoveryService, MeilisearchService],
})
export class DiscoveryModule {}
