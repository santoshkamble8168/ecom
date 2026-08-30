import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { renderTemplate } from "@ecom/shared";
import { NOTIFICATIONS_QUEUE, type NotificationSendJob } from "@ecom/types";
import type { Prisma } from "@prisma/client";
import type { Queue } from "bullmq";

import { PrismaService } from "../prisma/prisma.service";

const LOW_STOCK_TEMPLATE_KEY = "inventory.low_stock.email";

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationSendJob>,
  ) {}

  async enqueueLowStockAlert(skuCount: number): Promise<void> {
    const destination = process.env.NOTIFICATION_OPS_EMAIL ?? "ops@ecom.local";
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { key: LOW_STOCK_TEMPLATE_KEY },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!template || template.status !== "published" || !template.versions[0]) {
      this.logger.warn(`Skipping low-stock alert: template ${LOW_STOCK_TEMPLATE_KEY} is missing or unpublished`);
      return;
    }

    const version = template.versions[0];
    const variables = { skuCount: String(skuCount) };
    const subject = version.subject ? renderTemplate(version.subject, variables) : null;
    const body = renderTemplate(version.body, variables, { escapeHtml: true });

    const log = await this.prisma.deliveryLog.create({
      data: {
        templateKey: template.key,
        channel: template.channel,
        category: template.category,
        destination,
        status: "queued",
        eventType: "inventory.low_stock",
        payloadPreview: variables as Prisma.InputJsonValue,
      },
    });

    await this.queue.add(
      "send-email",
      {
        deliveryLogId: log.id,
        channel: "email",
        destination,
        subject,
        body,
      },
      {
        attempts: Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? 5),
        backoff: { type: "exponential", delay: Number(process.env.NOTIFICATION_BACKOFF_MS ?? 2000) },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
