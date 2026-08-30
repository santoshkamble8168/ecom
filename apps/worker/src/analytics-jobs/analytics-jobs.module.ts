import { Module } from "@nestjs/common";

import { AnalyticsJobsService } from "./analytics-jobs.service";

@Module({
  providers: [AnalyticsJobsService],
})
export class AnalyticsJobsModule {}
