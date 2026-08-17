import { Module } from "@nestjs/common";

import { InventoryJobsService } from "./inventory-jobs.service";

@Module({
  providers: [InventoryJobsService],
})
export class InventoryJobsModule {}
