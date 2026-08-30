import { Module } from "@nestjs/common";

import { AnalyticsModule } from "../analytics/analytics.module";
import { PlatformModule } from "../platform/platform.module";

import { RecommendationsAdminController } from "./recommendations-admin.controller";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

@Module({
  imports: [PlatformModule, AnalyticsModule],
  controllers: [RecommendationsController, RecommendationsAdminController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
