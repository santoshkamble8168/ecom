import { createHmac } from "node:crypto";

import { NotFoundError, ValidationError } from "@ecom/shared";

import type { AnalyticsService } from "../analytics/analytics.service";
import type { AuditService } from "../audit/audit.service";
import type { InventoryService } from "../inventory/inventory.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { PromotionsService } from "../promotions/promotions.service";

import { PaymentsService } from "./payments.service";
import type { RazorpayProvider } from "./razorpay.provider";

describe("PaymentsService Razorpay", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  let prisma: {
    payment: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    checkoutSession: { findUnique: jest.Mock };
    paymentWebhook: { findUnique: jest.Mock; create: jest.Mock };
  };
  let razorpay: {
    isMockMode: jest.Mock;
    getKeySecret: jest.Mock;
    getWebhookSecret: jest.Mock;
    fetchPayment: jest.Mock;
  };
  let service: PaymentsService;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    prisma = {
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      checkoutSession: { findUnique: jest.fn() },
      paymentWebhook: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "wh-1" }),
      },
    };
    razorpay = {
      isMockMode: jest.fn().mockReturnValue(false),
      getKeySecret: jest.fn().mockReturnValue("key_secret"),
      getWebhookSecret: jest.fn().mockReturnValue("whsec"),
      fetchPayment: jest.fn(),
    };
    service = new PaymentsService(
      prisma as unknown as PrismaService,
      razorpay as unknown as RazorpayProvider,
      { log: jest.fn() } as unknown as AuditService,
      {} as InventoryService,
      {} as PromotionsService,
      {} as NotificationsService,
      { trackServer: jest.fn() } as unknown as AnalyticsService,
    );
  });

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it("returns 404 for mock capture outside mock mode", async () => {
    razorpay.isMockMode.mockReturnValue(false);
    await expect(service.mockCapture("pay-1", "user-1")).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 for mock capture in production", async () => {
    process.env.NODE_ENV = "production";
    razorpay.isMockMode.mockReturnValue(true);
    await expect(service.mockCapture("pay-1", "user-1")).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it("rejects a client confirm signed for a different Razorpay order", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay-1",
      checkoutId: "chk-1",
      status: "pending",
      providerOrderId: "order_real",
      amount: 500,
      currency: "INR",
      method: "razorpay",
    });
    prisma.checkoutSession.findUnique.mockResolvedValue({
      id: "chk-1",
      userId: "user-1",
      sessionId: "session-1",
      status: "order_prepared",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const cheapSignature = createHmac("sha256", "key_secret")
      .update("order_cheap|pay_cheap")
      .digest("hex");

    await expect(
      service.confirmRazorpayClient(
        "pay-1",
        {
          razorpayOrderId: "order_cheap",
          razorpayPaymentId: "pay_cheap",
          razorpaySignature: cheapSignature,
        },
        "user-1",
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(razorpay.fetchPayment).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it("rejects an unsigned webhook even in mock mode", async () => {
    razorpay.isMockMode.mockReturnValue(true);
    await expect(
      service.handleRazorpayWebhook(JSON.stringify({ id: "evt_1", event: "payment.captured" }), "bad"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });
});
