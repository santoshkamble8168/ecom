import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { NotificationsAdminController } from "./notifications-admin.controller";
import { NotificationsController } from "./notifications.controller";
import { NOTIFICATIONS_QUEUE } from "./notifications.constants";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
