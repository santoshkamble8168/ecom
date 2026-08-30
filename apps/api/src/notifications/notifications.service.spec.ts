import type { ApiEnv } from "@ecom/config";
import { NotFoundError, ValidationError } from "@ecom/shared";
import type { Queue } from "bullmq";

import type { AuditService } from "../audit/audit.service";
import type { AppLogger } from "../logger/logger.service";
import type { PrismaService } from "../prisma/prisma.service";

import { NotificationsService } from "./notifications.service";

function publishedTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: "tpl-1",
    key: "order.confirmed.email",
    name: "Order confirmation",
    description: null,
    channel: "email",
    category: "transactional",
    status: "published",
    requiredVariables: ["orderNumber", "total"],
    versions: [
      {
        id: "ver-1",
        version: 1,
        subject: "Order {{orderNumber}} confirmed",
        body: "<p>Thanks {{orderNumber}} total {{total}}</p>",
        createdBy: "seed",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ],
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prisma: {
    notificationPreference: { upsert: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    notificationTemplate: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    notificationTemplateVersion: { findFirst: jest.Mock; create: jest.Mock };
    deliveryLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let queue: { add: jest.Mock };
  let env: ApiEnv;
  let logger: { setContext: jest.Mock; warn: jest.Mock; log: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      notificationPreference: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      notificationTemplate: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      notificationTemplateVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      deliveryLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(async (ops: unknown) => {
        if (Array.isArray(ops)) return Promise.all(ops);
        return ops;
      }),
    };
    queue = { add: jest.fn().mockResolvedValue({ id: "job-1" }) };
    env = {
      NOTIFICATION_MAX_ATTEMPTS: 5,
      NOTIFICATION_BACKOFF_MS: 2000,
      STOREFRONT_URL: "http://localhost:3000",
    } as ApiEnv;
    logger = { setContext: jest.fn(), warn: jest.fn(), log: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new NotificationsService(
      prisma as unknown as PrismaService,
      queue as unknown as Queue,
      env as ApiEnv,
      logger as unknown as AppLogger,
      audit as unknown as AuditService,
    );
  });

  describe("preferences", () => {
    it("upserts defaults and maps ISO dates", async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({
        emailTransactional: true,
        emailMarketing: false,
        smsTransactional: true,
        smsMarketing: false,
        unsubscribedAt: null,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      const prefs = await service.getPreferences("user-1");

      expect(prefs.emailTransactional).toBe(true);
      expect(prefs.emailMarketing).toBe(false);
      expect(prefs.unsubscribedAt).toBeNull();
      expect(prefs.updatedAt).toBe("2026-01-01T00:00:00.000Z");
    });

    it("sets unsubscribedAt when email marketing is turned off", async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({
        emailTransactional: true,
        emailMarketing: true,
        smsTransactional: true,
        smsMarketing: false,
        unsubscribedAt: null,
        updatedAt: new Date(),
      });
      prisma.notificationPreference.update.mockResolvedValue({
        emailTransactional: true,
        emailMarketing: false,
        smsTransactional: true,
        smsMarketing: false,
        unsubscribedAt: new Date("2026-02-01T00:00:00Z"),
        updatedAt: new Date("2026-02-01T00:00:00Z"),
      });

      const prefs = await service.updatePreferences("user-1", { emailMarketing: false });

      expect(prisma.notificationPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailMarketing: false,
            unsubscribedAt: expect.any(Date),
          }),
        }),
      );
      expect(prefs.unsubscribedAt).toBe("2026-02-01T00:00:00.000Z");
    });
  });

  describe("enqueue", () => {
    it("renders, writes a delivery log, and queues a send job", async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(publishedTemplate());
      prisma.user.findUnique.mockResolvedValue({ email: "ada@example.com", phone: null });
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      prisma.deliveryLog.create.mockResolvedValue({
        id: "log-1",
        userId: "user-1",
        templateKey: "order.confirmed.email",
        channel: "email",
        category: "transactional",
        destination: "ada@example.com",
        status: "queued",
        eventType: "order.confirmed",
        attempt: 0,
        errorMessage: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        sentAt: null,
      });

      const result = await service.enqueue({
        templateKey: "order.confirmed.email",
        eventType: "order.confirmed",
        userId: "user-1",
        variables: { orderNumber: "ECO1", total: "999" },
      });

      expect(result).toEqual(expect.objectContaining({ id: "log-1", status: "queued" }));
      expect(queue.add).toHaveBeenCalledWith(
        "send-email",
        expect.objectContaining({
          deliveryLogId: "log-1",
          destination: "ada@example.com",
          subject: "Order ECO1 confirmed",
          body: "<p>Thanks ECO1 total 999</p>",
        }),
        expect.objectContaining({ attempts: 5 }),
      );
    });

    it("rejects unknown templates", async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.enqueue({
          templateKey: "missing",
          eventType: "x",
          variables: {},
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("skips marketing when the user is not opted in", async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(
        publishedTemplate({
          key: "campaign.promo.email",
          category: "marketing",
          requiredVariables: ["campaignName"],
          versions: [
            {
              id: "ver-1",
              version: 1,
              subject: "{{campaignName}}",
              body: "Hi",
              createdBy: "seed",
              createdAt: new Date(),
            },
          ],
        }),
      );
      prisma.user.findUnique.mockResolvedValue({ email: "ada@example.com", phone: null });
      prisma.notificationPreference.findUnique.mockResolvedValue({
        emailMarketing: false,
        smsMarketing: false,
        unsubscribedAt: null,
      });
      prisma.deliveryLog.create.mockResolvedValue({
        id: "log-skip",
        userId: "user-1",
        templateKey: "campaign.promo.email",
        channel: "email",
        category: "marketing",
        destination: "ada@example.com",
        status: "skipped",
        eventType: "campaign",
        attempt: 0,
        errorMessage: "preference_blocked",
        createdAt: new Date(),
        sentAt: null,
      });

      const result = await service.enqueue({
        templateKey: "campaign.promo.email",
        eventType: "campaign",
        userId: "user-1",
        variables: { campaignName: "Sale" },
      });

      expect(result).toEqual(expect.objectContaining({ status: "skipped" }));
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("redacts OTP codes in the delivery-log preview", async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(
        publishedTemplate({
          key: "otp.email",
          requiredVariables: ["otpCode"],
          versions: [
            {
              id: "ver-1",
              version: 1,
              subject: "Code",
              body: "{{otpCode}}",
              createdBy: "seed",
              createdAt: new Date(),
            },
          ],
        }),
      );
      prisma.deliveryLog.create.mockResolvedValue({
        id: "log-otp",
        userId: null,
        templateKey: "otp.email",
        channel: "email",
        category: "transactional",
        destination: "ada@example.com",
        status: "queued",
        eventType: "auth.otp_requested",
        attempt: 0,
        errorMessage: null,
        createdAt: new Date(),
        sentAt: null,
      });

      await service.enqueue({
        templateKey: "otp.email",
        eventType: "auth.otp_requested",
        destination: "ada@example.com",
        variables: { otpCode: "654321" },
      });

      expect(prisma.deliveryLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payloadPreview: { otpCode: "[redacted]" },
          }),
        }),
      );
    });

    it("does not throw from enqueueSafe", async () => {
      prisma.notificationTemplate.findUnique.mockRejectedValue(new Error("db down"));

      await expect(
        service.enqueueSafe({
          templateKey: "order.confirmed.email",
          eventType: "order.confirmed",
          variables: { orderNumber: "x", total: "1" },
        }),
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe("admin templates", () => {
    it("creates a draft with version 1", async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(null);
      prisma.notificationTemplate.create.mockResolvedValue(
        publishedTemplate({ status: "draft", key: "custom.alert.email" }),
      );

      const created = await service.createTemplate(
        {
          key: "custom.alert.email",
          name: "Alert",
          channel: "email",
          category: "operational",
          body: "<p>Hi</p>",
        },
        "admin-1",
      );

      expect(created.status).toBe("draft");
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "notification.template_created" }),
      );
    });

    it("previews without enqueueing", async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(publishedTemplate());

      const preview = await service.preview("tpl-1", { orderNumber: "ECO1", total: "10" });

      expect(preview.subject).toBe("Order ECO1 confirmed");
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("rejects publish when there are no versions", async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(publishedTemplate({ versions: [] }));

      await expect(service.publishTemplate("tpl-1", "admin-1")).rejects.toThrow(ValidationError);
    });
  });
});
