import type { ApiEnv } from "@ecom/config";
import {
  allowsNotification,
  assertRequiredVariables,
  ConflictError,
  NotFoundError,
  renderTemplate,
  sanitizePayloadPreview,
  ValidationError,
} from "@ecom/shared";
import type {
  DeliveryLogEntry,
  DeliveryLogListResult,
  DeliveryStatus,
  NotificationChannel,
  NotificationPreferences,
  NotificationPreviewResult,
  NotificationSendJob,
  NotificationTemplateDetail,
  NotificationTemplateSummary,
  NotificationTemplateVersion,
  PatchNotificationPreferences,
} from "@ecom/types";
import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { DeliveryLog, NotificationPreference, Prisma } from "@prisma/client";
import type { Queue } from "bullmq";

import { AuditService } from "../audit/audit.service";
import { APP_ENV } from "../config/config.module";
import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

import type { CreateNotificationTemplateDto } from "./dto/create-template.dto";
import type { CreateTemplateVersionDto } from "./dto/create-template-version.dto";
import type { ListDeliveriesQueryDto } from "./dto/list-deliveries-query.dto";
import type { UpdateNotificationTemplateDto } from "./dto/update-template.dto";
import { NOTIFICATIONS_QUEUE } from "./notifications.constants";

export interface EnqueueNotificationInput {
  templateKey: string;
  eventType: string;
  variables: Record<string, unknown>;
  destination?: string;
  userId?: string;
  /** Skip preference checks (admin test-send). */
  force?: boolean;
}

const TEMPLATE_INCLUDE = {
  versions: { orderBy: { version: "desc" as const } },
} satisfies Prisma.NotificationTemplateInclude;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationSendJob>,
    @Inject(APP_ENV) private readonly env: ApiEnv,
    private readonly logger: AppLogger,
    private readonly audit: AuditService,
  ) {
    this.logger.setContext("NotificationsService");
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return this.toPrefs(row);
  }

  async updatePreferences(userId: string, dto: PatchNotificationPreferences): Promise<NotificationPreferences> {
    const current = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const emailMarketing = dto.emailMarketing ?? current.emailMarketing;
    const smsMarketing = dto.smsMarketing ?? current.smsMarketing;
    let unsubscribedAt = current.unsubscribedAt;
    if (dto.emailMarketing === false) unsubscribedAt = new Date();
    if (dto.emailMarketing === true) unsubscribedAt = null;

    const row = await this.prisma.notificationPreference.update({
      where: { userId },
      data: { emailMarketing, smsMarketing, unsubscribedAt },
    });
    return this.toPrefs(row);
  }

  /**
   * Load a published template, render, respect preferences, write a DeliveryLog,
   * and enqueue a BullMQ send job. Never throws to callers of `enqueueSafe`.
   */
  async enqueue(input: EnqueueNotificationInput): Promise<DeliveryLogEntry | { skipped: true; reason: string }> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { key: input.templateKey },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) {
      throw new NotFoundError(`Unknown notification template: ${input.templateKey}`);
    }
    if (template.status !== "published" && !input.force) {
      throw new ValidationError(`Template ${input.templateKey} is not published`);
    }

    const version = template.versions[0];
    if (!version) {
      throw new ValidationError(`Template ${input.templateKey} has no versions`);
    }

    if (!input.force) {
      assertRequiredVariables(template.requiredVariables, input.variables);
    }

    const channel = template.channel;
    if (channel !== "email" && channel !== "sms") {
      throw new ValidationError(`Channel ${channel} is not implemented`);
    }

    const destination = await this.resolveDestination(channel, input);
    if (!destination) {
      const skipped = await this.recordSkipped(input, template.category, channel, "missing_destination");
      return skipped;
    }

    if (!input.force) {
      const prefs = input.userId
        ? await this.prisma.notificationPreference.findUnique({ where: { userId: input.userId } })
        : null;
      if (!allowsNotification(template.category, channel, prefs)) {
        const skipped = await this.recordSkipped(
          input,
          template.category,
          channel,
          "preference_blocked",
          destination,
        );
        return skipped;
      }
    }

    const escapeHtml = channel === "email";
    const subject = version.subject
      ? renderTemplate(version.subject, input.variables, { escapeHtml: false })
      : null;
    const body = renderTemplate(version.body, input.variables, { escapeHtml });

    const log = await this.prisma.deliveryLog.create({
      data: {
        userId: input.userId ?? null,
        templateKey: template.key,
        channel,
        category: template.category,
        destination,
        status: "queued",
        eventType: input.eventType,
        payloadPreview: sanitizePayloadPreview(input.variables) as Prisma.InputJsonValue,
      },
    });

    await this.queue.add(
      channel === "email" ? "send-email" : "send-sms",
      {
        deliveryLogId: log.id,
        channel,
        destination,
        subject,
        body,
      },
      {
        attempts: this.env.NOTIFICATION_MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: this.env.NOTIFICATION_BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return this.toDeliveryEntry(log);
  }

  async enqueueSafe(input: EnqueueNotificationInput): Promise<void> {
    try {
      await this.enqueue(input);
    } catch (error) {
      this.logger.warn(
        `Notification enqueue failed for ${input.templateKey}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async notifyOrderConfirmed(order: {
    id: string;
    orderNumber: string;
    userId: string | null;
    total: { toString(): string } | string | number;
    currency: string;
  }): Promise<void> {
    await this.enqueueSafe({
      templateKey: "order.confirmed.email",
      eventType: "order.confirmed",
      userId: order.userId ?? undefined,
      variables: {
        orderNumber: order.orderNumber,
        total: String(order.total),
        currency: order.currency,
        orderUrl: `${this.env.STOREFRONT_URL}/account/orders/${order.id}`,
      },
    });
  }

  async notifyPaymentFailed(payment: {
    userId: string | null;
    reference: string;
  }): Promise<void> {
    await this.enqueueSafe({
      templateKey: "payment.failed.email",
      eventType: "payment.failed",
      userId: payment.userId ?? undefined,
      variables: { orderRef: payment.reference },
    });
  }

  async notifyShipmentUpdated(order: {
    orderNumber: string;
    userId: string | null;
  }, shipment: { shipmentNumber: string; trackingNumber: string | null }): Promise<void> {
    await this.enqueueSafe({
      templateKey: "shipment.updated.email",
      eventType: "shipment.updated",
      userId: order.userId ?? undefined,
      variables: {
        orderNumber: order.orderNumber,
        shipmentNumber: shipment.shipmentNumber,
        trackingNumber: shipment.trackingNumber ?? "pending",
      },
    });
  }

  async notifyReturnUpdated(order: {
    orderNumber: string;
    userId: string | null;
  }, returnStatus: string): Promise<void> {
    await this.enqueueSafe({
      templateKey: "return.updated.email",
      eventType: "return.updated",
      userId: order.userId ?? undefined,
      variables: { orderNumber: order.orderNumber, returnStatus },
    });
  }

  async listTemplates(): Promise<{ templates: NotificationTemplateSummary[] }> {
    const rows = await this.prisma.notificationTemplate.findMany({
      include: { versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } } },
      orderBy: { key: "asc" },
    });
    return {
      templates: rows.map((row) => ({
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description,
        channel: row.channel,
        category: row.category,
        status: row.status,
        requiredVariables: row.requiredVariables,
        latestVersion: row.versions[0]?.version ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async getTemplate(id: string): Promise<NotificationTemplateDetail> {
    const row = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    if (!row) throw new NotFoundError("Notification template not found");
    return this.toTemplateDetail(row);
  }

  async createTemplate(dto: CreateNotificationTemplateDto, adminId: string): Promise<NotificationTemplateDetail> {
    const existing = await this.prisma.notificationTemplate.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictError("A template with this key already exists");

    const row = await this.prisma.notificationTemplate.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        channel: dto.channel,
        category: dto.category,
        status: "draft",
        requiredVariables: dto.requiredVariables ?? [],
        versions: {
          create: {
            version: 1,
            subject: dto.subject ?? null,
            body: dto.body,
            createdBy: adminId,
          },
        },
      },
      include: TEMPLATE_INCLUDE,
    });

    await this.audit.log({
      userId: adminId,
      action: "notification.template_created",
      entityType: "notification_template",
      entityId: row.id,
      metadata: { key: row.key },
    });

    return this.toTemplateDetail(row);
  }

  async updateTemplate(
    id: string,
    dto: UpdateNotificationTemplateDto,
    adminId: string,
  ): Promise<NotificationTemplateDetail> {
    await this.requireTemplate(id);
    const row = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.requiredVariables !== undefined ? { requiredVariables: dto.requiredVariables } : {}),
      },
      include: TEMPLATE_INCLUDE,
    });

    await this.audit.log({
      userId: adminId,
      action: "notification.template_updated",
      entityType: "notification_template",
      entityId: id,
    });

    return this.toTemplateDetail(row);
  }

  async createVersion(
    id: string,
    dto: CreateTemplateVersionDto,
    adminId: string,
  ): Promise<NotificationTemplateVersion> {
    const template = await this.requireTemplate(id);
    const latest = await this.prisma.notificationTemplateVersion.findFirst({
      where: { templateId: id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const [created] = await this.prisma.$transaction([
      this.prisma.notificationTemplateVersion.create({
        data: {
          templateId: id,
          version: nextVersion,
          subject: dto.subject ?? null,
          body: dto.body,
          createdBy: adminId,
        },
      }),
      this.prisma.notificationTemplate.update({
        where: { id },
        data: { status: template.status === "published" ? "draft" : template.status },
      }),
    ]);

    await this.audit.log({
      userId: adminId,
      action: "notification.template_version_created",
      entityType: "notification_template",
      entityId: id,
      metadata: { version: nextVersion },
    });

    return this.toVersion(created);
  }

  async publishTemplate(id: string, adminId: string): Promise<NotificationTemplateDetail> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) throw new NotFoundError("Notification template not found");
    if (template.versions.length === 0) {
      throw new ValidationError("Cannot publish a template with no versions");
    }

    const row = await this.prisma.notificationTemplate.update({
      where: { id },
      data: { status: "published" },
      include: TEMPLATE_INCLUDE,
    });

    await this.audit.log({
      userId: adminId,
      action: "notification.template_published",
      entityType: "notification_template",
      entityId: id,
    });

    return this.toTemplateDetail(row);
  }

  async preview(
    id: string,
    variables: Record<string, unknown>,
    versionNumber?: number,
  ): Promise<NotificationPreviewResult> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) throw new NotFoundError("Notification template not found");

    const version = versionNumber
      ? template.versions.find((item) => item.version === versionNumber)
      : template.versions[0];
    if (!version) throw new NotFoundError("Template version not found");

    const escapeHtml = template.channel === "email";
    return {
      subject: version.subject ? renderTemplate(version.subject, variables, { escapeHtml: false }) : null,
      body: renderTemplate(version.body, variables, { escapeHtml }),
    };
  }

  async testSend(
    id: string,
    destination: string,
    variables: Record<string, unknown> | undefined,
    adminId: string,
  ): Promise<DeliveryLogEntry | { skipped: true; reason: string }> {
    const template = await this.requireTemplate(id);
    const result = await this.enqueue({
      templateKey: template.key,
      eventType: "admin.test_send",
      destination,
      variables: variables ?? {},
      force: true,
    });

    await this.audit.log({
      userId: adminId,
      action: "notification.test_sent",
      entityType: "notification_template",
      entityId: id,
      metadata: { destination },
    });

    return result;
  }

  async listDeliveries(query: ListDeliveriesQueryDto): Promise<DeliveryLogListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.DeliveryLogWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.templateKey ? { templateKey: query.templateKey } : {}),
      ...(query.destination ? { destination: { contains: query.destination, mode: "insensitive" } } : {}),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.deliveryLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deliveryLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => this.toDeliveryEntry(log)),
      total,
      page,
      pageSize,
    };
  }

  private async requireTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundError("Notification template not found");
    return template;
  }

  private async resolveDestination(
    channel: "email" | "sms",
    input: EnqueueNotificationInput,
  ): Promise<string | null> {
    if (input.destination?.trim()) return input.destination.trim();
    if (!input.userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) return null;
    if (channel === "email") return user.email;
    return user.phone;
  }

  private async recordSkipped(
    input: EnqueueNotificationInput,
    category: NotificationTemplateDetail["category"] | string,
    channel: NotificationChannel,
    reason: string,
    destination = "",
  ): Promise<DeliveryLogEntry> {
    const log = await this.prisma.deliveryLog.create({
      data: {
        userId: input.userId ?? null,
        templateKey: input.templateKey,
        channel,
        category: category as DeliveryLog["category"],
        destination: destination || "n/a",
        status: "skipped",
        eventType: input.eventType,
        errorMessage: reason,
        payloadPreview: sanitizePayloadPreview(input.variables) as Prisma.InputJsonValue,
      },
    });
    return this.toDeliveryEntry(log);
  }

  private toPrefs(row: NotificationPreference): NotificationPreferences {
    return {
      emailTransactional: row.emailTransactional,
      emailMarketing: row.emailMarketing,
      smsTransactional: row.smsTransactional,
      smsMarketing: row.smsMarketing,
      unsubscribedAt: row.unsubscribedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toTemplateDetail(
    row: Prisma.NotificationTemplateGetPayload<{ include: typeof TEMPLATE_INCLUDE }>,
  ): NotificationTemplateDetail {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      channel: row.channel,
      category: row.category,
      status: row.status,
      requiredVariables: row.requiredVariables,
      latestVersion: row.versions[0]?.version ?? null,
      updatedAt: row.updatedAt.toISOString(),
      versions: row.versions
        .slice()
        .sort((a, b) => a.version - b.version)
        .map((version) => this.toVersion(version)),
    };
  }

  private toVersion(row: {
    id: string;
    version: number;
    subject: string | null;
    body: string;
    createdBy: string | null;
    createdAt: Date;
  }): NotificationTemplateVersion {
    return {
      id: row.id,
      version: row.version,
      subject: row.subject,
      body: row.body,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toDeliveryEntry(log: DeliveryLog): DeliveryLogEntry {
    return {
      id: log.id,
      userId: log.userId,
      templateKey: log.templateKey,
      channel: log.channel,
      category: log.category,
      destination: log.destination,
      status: log.status as DeliveryStatus,
      eventType: log.eventType,
      attempt: log.attempt,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
      sentAt: log.sentAt?.toISOString() ?? null,
    };
  }
}
