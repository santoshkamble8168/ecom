import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { NOTIFICATIONS_QUEUE } from "@ecom/types";

import { NotificationDispatchService } from "./notification-dispatch.service";
import { NotificationsProcessor } from "./notifications.processor";
import { NotificationsRetentionService } from "./notifications.retention.service";

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [NotificationsProcessor, NotificationsRetentionService, NotificationDispatchService],
  exports: [NotificationDispatchService],
})
export class NotificationsModule {}
