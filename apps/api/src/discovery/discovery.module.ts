import { Module } from "@nestjs/common";

import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { MeilisearchService } from "./meilisearch.service";

@Module({
  controllers: [DiscoveryController],
  providers: [DiscoveryService, MeilisearchService],
  exports: [DiscoveryService, MeilisearchService],
})
export class DiscoveryModule {}
