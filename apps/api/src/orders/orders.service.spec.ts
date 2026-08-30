import { ConflictError, NotFoundError, ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { AnalyticsService } from "../analytics/analytics.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";

import { OrdersService } from "./orders.service";

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "ECO260101123456",
    userId: "user-1",
    status: "confirmed",
    total: { toString: () => "999.00" },
    subtotal: { toString: () => "899.00" },
    discount: { toString: () => "0.00" },
    shippingFee: { toString: () => "49.00" },
    taxAmount: { toString: () => "51.00" },
    currency: "INR",
    paymentMethod: "razorpay",
    confirmedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    shippingAddress: { fullName: "Jane Doe", phone: "9876543210", line1: "42 MG Road", line2: null, city: "Bengaluru", state: "Karnataka", postalCode: "560001", country: "IN" },
    lineItems: [
      { variantSku: "CCN-BLK-M", quantity: 2, unitPrice: "499.00", product: { title: "Classic Tee" }, variantLabel: "M / Black" },
    ],
    payments: [{ status: "captured" }],
    statusHistory: [],
    shipments: [],
    invoice: null,
    returnRequests: [],
    exchangeRequests: [],
    ...overrides,
  };
}

describe("OrdersService", () => {
  let service: OrdersService;
  let prisma: {
    order: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; findMany: jest.Mock; update: jest.Mock; count: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
    returnRequest: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    exchangeRequest: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    returnReason: { findUnique: jest.Mock };
    exchangeReason: { findUnique: jest.Mock };
    payment: { findFirst: jest.Mock };
    refundRequest: { create: jest.Mock };
    invoice: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; create: jest.Mock };
    courier: { findMany: jest.Mock };
  };
  let audit: { log: jest.Mock };
  let notifications: { notifyReturnUpdated: jest.Mock; notifyShipmentUpdated: jest.Mock };
  let analytics: { trackServer: jest.Mock };

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn(),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      returnRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      exchangeRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      returnReason: { findUnique: jest.fn() },
      exchangeReason: { findUnique: jest.fn() },
      payment: { findFirst: jest.fn() },
      refundRequest: { create: jest.fn() },
      invoice: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn() },
      courier: { findMany: jest.fn() },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    notifications = {
      notifyReturnUpdated: jest.fn().mockResolvedValue(undefined),
      notifyShipmentUpdated: jest.fn().mockResolvedValue(undefined),
    };
    analytics = { trackServer: jest.fn().mockResolvedValue(undefined) };

    service = new OrdersService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      notifications as unknown as NotificationsService,
      analytics as unknown as AnalyticsService,
    );
  });

  describe("cancel", () => {
    it("cancels an order the user owns while it is still cancellable", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "confirmed" }));

      await service.cancel("order-1", "user-1", "Changed my mind");

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "cancelled" },
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderId: "order-1", fromStatus: "confirmed", toStatus: "cancelled" }),
        }),
      );
      expect(audit.log).toHaveBeenCalled();
    });

    it("throws NotFoundError when the order belongs to a different user", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ userId: "someone-else" }));

      await expect(service.cancel("order-1", "user-1")).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError once the order has shipped", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "shipped" }));

      await expect(service.cancel("order-1", "user-1")).rejects.toThrow(ValidationError);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe("requestReturn", () => {
    const dto = { reasonCode: "size_issue", items: [{ variantSku: "CCN-BLK-M", quantity: 1 }], comments: "Too small" };
    const deliveredYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    it("rejects items that were not part of the order", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "delivered", shipments: [{ deliveredAt: deliveredYesterday }] }));

      await expect(
        service.requestReturn("order-1", "user-1", { ...dto, items: [{ variantSku: "UNKNOWN-SKU", quantity: 1 }] }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects a return quantity exceeding what was purchased", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "delivered", shipments: [{ deliveredAt: deliveredYesterday }] }));

      await expect(
        service.requestReturn("order-1", "user-1", { ...dto, items: [{ variantSku: "CCN-BLK-M", quantity: 5 }] }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects returns for orders that have not been delivered", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "shipped" }));

      await expect(service.requestReturn("order-1", "user-1", dto)).rejects.toThrow(ValidationError);
    });

    it("rejects an unknown return reason", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "delivered", shipments: [{ deliveredAt: deliveredYesterday }] }));
      prisma.returnReason.findUnique.mockResolvedValue(null);

      await expect(service.requestReturn("order-1", "user-1", dto)).rejects.toThrow(ValidationError);
    });

    it("prevents opening a second return request while one is already in progress", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "delivered", shipments: [{ deliveredAt: deliveredYesterday }] }));
      prisma.returnReason.findUnique.mockResolvedValue({ id: "reason-1", code: "size_issue", label: "Size doesn't fit", isActive: true });
      prisma.returnRequest.findFirst.mockResolvedValue({ id: "existing-return" });

      await expect(service.requestReturn("order-1", "user-1", dto)).rejects.toThrow(ConflictError);
    });

    it("creates a return request and transitions the order to return_requested", async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "delivered", shipments: [{ deliveredAt: deliveredYesterday }] }));
      prisma.returnReason.findUnique.mockResolvedValue({ id: "reason-1", code: "size_issue", label: "Size doesn't fit", isActive: true });
      prisma.returnRequest.findFirst.mockResolvedValue(null);
      prisma.returnRequest.create.mockResolvedValue({
        id: "return-1",
        orderId: "order-1",
        status: "requested",
        items: dto.items,
        comments: dto.comments,
        refundAmount: null,
        requestedAt: new Date(),
        resolvedAt: null,
        reason: { code: "size_issue", label: "Size doesn't fit" },
      });

      const result = await service.requestReturn("order-1", "user-1", dto);

      expect(result.status).toBe("requested");
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "return_requested" } });
    });
  });

  describe("adminResolveReturn", () => {
    it("rejects approving a return that is not pending", async () => {
      prisma.returnRequest.findUnique.mockResolvedValue({
        id: "return-1",
        orderId: "order-1",
        status: "approved",
        reason: { code: "size_issue", label: "Size doesn't fit" },
      });
      prisma.order.findUniqueOrThrow.mockResolvedValue(baseOrder({ status: "return_requested" }));

      await expect(service.adminResolveReturn("return-1", { action: "approve" }, "admin-1")).rejects.toThrow(ValidationError);
    });

    it("refunds only after the item has been received", async () => {
      prisma.returnRequest.findUnique.mockResolvedValue({
        id: "return-1",
        orderId: "order-1",
        status: "approved",
        reason: { code: "size_issue", label: "Size doesn't fit" },
      });
      prisma.order.findUniqueOrThrow.mockResolvedValue(baseOrder({ status: "return_requested" }));

      await expect(service.adminResolveReturn("return-1", { action: "refund" }, "admin-1")).rejects.toThrow(ValidationError);
      expect(prisma.refundRequest.create).not.toHaveBeenCalled();
    });

    it("creates a completed refund request and marks the order returned", async () => {
      prisma.returnRequest.findUnique.mockResolvedValue({
        id: "return-1",
        orderId: "order-1",
        status: "item_received",
        refundAmount: { toString: () => "999.00" },
        reason: { code: "size_issue", label: "Size doesn't fit" },
      });
      prisma.order.findUniqueOrThrow.mockResolvedValue(baseOrder({ status: "return_requested" }));
      prisma.payment.findFirst.mockResolvedValue({ id: "payment-1" });
      prisma.returnRequest.update.mockResolvedValue({
        id: "return-1",
        orderId: "order-1",
        status: "refunded",
        items: [],
        comments: null,
        refundAmount: { toString: () => "999.00" },
        requestedAt: new Date(),
        resolvedAt: new Date(),
        reason: { code: "size_issue", label: "Size doesn't fit" },
      });

      const result = await service.adminResolveReturn("return-1", { action: "refund" }, "admin-1");

      expect(prisma.refundRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ paymentId: "payment-1", orderId: "order-1", status: "completed" }) }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "returned" } });
      expect(result.status).toBe("refunded");
    });
  });
});
