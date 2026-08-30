import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { InventoryJobsService } from "./inventory-jobs.service";

@Module({
  imports: [NotificationsModule],
  providers: [InventoryJobsService],
})
export class InventoryJobsModule {}
