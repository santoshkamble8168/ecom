import { Module } from "@nestjs/common";

import { PersonalizationJobsService } from "./personalization-jobs.service";

@Module({
  providers: [PersonalizationJobsService],
})
export class PersonalizationJobsModule {}
