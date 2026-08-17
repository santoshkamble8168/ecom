import { Module } from "@nestjs/common";

import { PricingJobsService } from "./pricing-jobs.service";

@Module({
  providers: [PricingJobsService],
})
export class PricingJobsModule {}
