import { Module } from "@nestjs/common";

import { CmsJobsService } from "./cms-jobs.service";

@Module({
  providers: [CmsJobsService],
})
export class CmsJobsModule {}
