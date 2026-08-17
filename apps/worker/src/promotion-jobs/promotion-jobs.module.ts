import { Module } from "@nestjs/common";

import { PromotionJobsService } from "./promotion-jobs.service";

@Module({
  providers: [PromotionJobsService],
})
export class PromotionJobsModule {}
