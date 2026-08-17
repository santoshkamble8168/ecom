import { Module } from "@nestjs/common";

import { PricingModule } from "../pricing/pricing.module";

import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { MeilisearchService } from "./meilisearch.service";

@Module({
  imports: [PricingModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, MeilisearchService],
  exports: [DiscoveryService, MeilisearchService],
})
export class DiscoveryModule {}
