import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NOTIFICATIONS_QUEUE, type NotificationSendJob } from "@ecom/types";
import type { Queue } from "bullmq";

@Injectable()
export class NotificationsRetentionService {
  private readonly logger = new Logger(NotificationsRetentionService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationSendJob>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanFailedJobs(): Promise<void> {
    const days = Number(process.env.NOTIFICATION_DLQ_RETENTION_DAYS ?? 14);
    const retentionMs = days * 24 * 60 * 60 * 1000;
    const removed = await this.queue.clean(retentionMs, 1000, "failed");
    const waiting = await this.queue.getWaitingCount();
    const failed = await this.queue.getFailedCount();
    this.logger.log(
      `Notification DLQ cleanup removed ${removed.length} failed job(s) older than ${days}d; waiting=${waiting} failed=${failed}`,
    );
  }
}
