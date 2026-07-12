import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { NOTIFICATIONS_QUEUE } from "./notifications.constants";
import { NotificationsProcessor } from "./notifications.processor";

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [NotificationsProcessor],
})
export class NotificationsModule {}
