import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import { NOTIFICATIONS_QUEUE, type NotificationJobData } from "./notifications.constants";

/**
 * Sprint 0 ships the queue plumbing so later sprints (notifications,
 * marketing) can register real email/SMS senders without re-architecting
 * job dispatch. This processor currently just logs the job.
 */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(`Processing ${job.name} job ${job.id} for ${job.data.destination}`);
  }
}
