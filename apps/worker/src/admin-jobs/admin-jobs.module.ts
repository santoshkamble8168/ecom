import { Module } from "@nestjs/common";

import { AdminJobsService } from "./admin-jobs.service";

@Module({
  providers: [AdminJobsService],
})
export class AdminJobsModule {}
