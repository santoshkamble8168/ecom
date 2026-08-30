import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { NotificationSendJob } from "@ecom/types";
import type { Job } from "bullmq";
import type { Transporter } from "nodemailer";

import { PrismaService } from "../prisma/prisma.service";

import { createMailTransport, sendEmail } from "./email.adapter";
import { NOTIFICATIONS_QUEUE, truncateDeliveryError } from "./notifications.constants";
import { sendSms } from "./sms.adapter";

@Processor(NOTIFICATIONS_QUEUE, {
  concurrency: Number(process.env.NOTIFICATION_QUEUE_CONCURRENCY ?? 5),
})
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly transport: Transporter;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.transport = createMailTransport();
  }

  async process(job: Job<NotificationSendJob>): Promise<void> {
    const { deliveryLogId, channel, destination, subject, body } = job.data;
    const attempts = job.opts.attempts ?? 1;
    const attemptNumber = (job.attemptsMade ?? 0) + 1;

    await this.prisma.deliveryLog.update({
      where: { id: deliveryLogId },
      data: { status: "sending", attempt: attemptNumber },
    });

    try {
      if (channel === "email") {
        const messageId = await sendEmail(this.transport, { to: destination, subject, html: body });
        await this.prisma.deliveryLog.update({
          where: { id: deliveryLogId },
          data: {
            status: "sent",
            sentAt: new Date(),
            providerMessageId: messageId ?? null,
            errorMessage: null,
          },
        });
        return;
      }

      if (channel === "sms") {
        const result = await sendSms(destination, body);
        await this.prisma.deliveryLog.update({
          where: { id: deliveryLogId },
          data: {
            status: result.status === "skipped" ? "skipped" : "sent",
            sentAt: result.status === "sent" ? new Date() : null,
            providerMessageId: result.providerMessageId,
            errorMessage: result.status === "skipped" ? "sms_disabled" : null,
          },
        });
        return;
      }

      throw new Error(`Unsupported notification channel: ${channel}`);
    } catch (error) {
      const message = truncateDeliveryError(error instanceof Error ? error.message : String(error));
      const lastAttempt = attemptNumber >= attempts;
      await this.prisma.deliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: lastAttempt ? "failed" : "queued",
          errorMessage: message,
          attempt: attemptNumber,
        },
      });
      this.logger.warn(`Delivery ${deliveryLogId} failed (attempt ${attemptNumber}/${attempts}): ${message}`);
      throw error;
    }
  }
}
