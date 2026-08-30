import type {
  AdminOrderDetail,
  AdminOrderListResult,
  CustomerOrderSummary,
  ExchangeRequestSummary,
  OrderDetail,
  OrderInvoiceSummary,
  OrderReturnItem,
  OrderShippingAddress,
  OrderStatusEvent,
  ReasonOption,
  ReturnRequestSummary,
  ShipmentSummary,
  TrackingEventSummary,
} from "@ecom/types";
import { ConflictError, NotFoundError, ValidationError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import type {
  ExchangeRequest as ExchangeRequestModel,
  Order as OrderModel,
  OrderStatus,
  Prisma,
  ReturnRequest as ReturnRequestModel,
  Shipment as ShipmentModel,
  ShipmentItem as ShipmentItemModel,
  ShipmentStatus,
  TrackingEvent as TrackingEventModel,
} from "@prisma/client";

import { AnalyticsService } from "../analytics/analytics.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import type { AddTrackingEventDto } from "./dto/add-tracking-event.dto";
import type { CreateShipmentDto } from "./dto/create-shipment.dto";
import type { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import type { RequestExchangeDto } from "./dto/request-exchange.dto";
import type { RequestReturnDto } from "./dto/request-return.dto";
import type { ResolveExchangeDto } from "./dto/resolve-exchange.dto";
import type { ResolveReturnDto } from "./dto/resolve-return.dto";
import type { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import {
  assertCancellable,
  assertExchangeEligible,
  assertReturnEligible,
  assertTransition,
  exchangeWindowEndsAt,
  generateInvoiceNumber,
  generateShipmentNumber,
  isCancellable,
  isExchangeEligible,
  isReturnEligible,
  returnWindowEndsAt,
} from "./policies/order-state-machine";

type LineItemSnapshot = {
  variantSku: string;
  quantity: number;
  unitPrice: string;
  product: { title: string } | null;
  variantLabel: string | null;
};

const ORDER_WITH_RELATIONS = {
  payments: { orderBy: { createdAt: "desc" as const }, take: 1 },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  shipments: { include: { courier: true, items: true, events: { orderBy: { occurredAt: "asc" as const } } } },
  invoice: true,
  returnRequests: { include: { reason: true }, orderBy: { requestedAt: "desc" as const } },
  exchangeRequests: { include: { reason: true }, orderBy: { requestedAt: "desc" as const } },
} satisfies Prisma.OrderInclude;

/**
 * Invoice HTML embeds customer-supplied fields (shipping address, product
 * titles) directly into a served-to-the-browser document — escape them so a
 * malicious/malformed name or address line can't inject markup or scripts
 * into the invoice view.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_WITH_RELATIONS }>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ---------------------------------------------------------------------
  // Customer-facing
  // ---------------------------------------------------------------------

  async listForUser(userId: string): Promise<CustomerOrderSummary[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return orders.map((order) => this.toSummary(order));
  }

  async getDetailForUser(orderId: string, userId: string): Promise<OrderDetail> {
    const order = await this.loadOwnedOrder(orderId, userId);
    return this.toDetail(order);
  }

  async cancel(orderId: string, userId: string, reason?: string): Promise<OrderDetail> {
    const order = await this.loadOwnedOrder(orderId, userId);
    assertCancellable(order.status);
    assertTransition(order.status, "cancelled");

    await this.transition(order.id, order.status, "cancelled", "customer", userId, reason ?? "Cancelled by customer");

    // If the payment was already captured (online prepay), open a refund-ready hook
    // for finance/support to process — see RefundRequest ("pending"). Actual gateway
    // settlement happens via POST /admin/payments/:id/refunds (Sprint 8 refund flow).
    const capturedPayment = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: "captured" },
      orderBy: { createdAt: "desc" },
    });
    if (capturedPayment) {
      await this.prisma.refundRequest.create({
        data: {
          paymentId: capturedPayment.id,
          orderId: order.id,
          amount: capturedPayment.amount,
          currency: capturedPayment.currency,
          reason: `Order cancelled by customer${reason ? `: ${reason}` : ""}`,
          status: "pending",
        },
      });
    }

    await this.audit.log({
      userId,
      action: "OrderCancelled",
      entityType: "order",
      entityId: order.id,
      metadata: { reason },
    });

    return this.getDetailForUser(orderId, userId);
  }

  async requestReturn(orderId: string, userId: string, dto: RequestReturnDto): Promise<ReturnRequestSummary> {
    const order = await this.loadOwnedOrder(orderId, userId);
    const deliveredAt = this.deliveredAtOf(order);
    assertReturnEligible(order.status, deliveredAt);
    this.assertItemsBelongToOrder(order, dto.items);

    const reason = await this.prisma.returnReason.findUnique({ where: { code: dto.reasonCode } });
    if (!reason || !reason.isActive) throw new ValidationError("Invalid return reason");

    const existingOpen = await this.prisma.returnRequest.findFirst({
      where: { orderId, status: { in: ["requested", "approved", "item_received"] } },
    });
    if (existingOpen) throw new ConflictError("A return request is already in progress for this order");

    const created = await this.prisma.returnRequest.create({
      data: {
        orderId,
        userId,
        reasonId: reason.id,
        items: dto.items as unknown as Prisma.InputJsonValue,
        comments: dto.comments,
        evidenceUrls: dto.evidenceUrls ?? [],
      },
      include: { reason: true },
    });

    await this.transition(order.id, order.status, "return_requested", "customer", userId, `Return requested: ${reason.label}`);

    await this.audit.log({
      userId,
      action: "ReturnRequested",
      entityType: "return_request",
      entityId: created.id,
      metadata: { orderId, reasonCode: dto.reasonCode },
    });

    void this.notifications.notifyReturnUpdated(order, created.status);
    void this.analytics.trackServer({
      name: "return_request",
      userId,
      properties: { orderId, orderNumber: order.orderNumber },
    });
    return this.toReturnSummary(created);
  }

  async requestExchange(orderId: string, userId: string, dto: RequestExchangeDto): Promise<ExchangeRequestSummary> {
    const order = await this.loadOwnedOrder(orderId, userId);
    const deliveredAt = this.deliveredAtOf(order);
    assertExchangeEligible(order.status, deliveredAt);
    this.assertItemsBelongToOrder(order, dto.originalItems);

    const reason = await this.prisma.exchangeReason.findUnique({ where: { code: dto.reasonCode } });
    if (!reason || !reason.isActive) throw new ValidationError("Invalid exchange reason");

    const existingOpen = await this.prisma.exchangeRequest.findFirst({
      where: { orderId, status: { in: ["requested", "approved", "item_received"] } },
    });
    if (existingOpen) throw new ConflictError("An exchange request is already in progress for this order");

    const created = await this.prisma.exchangeRequest.create({
      data: {
        orderId,
        userId,
        reasonId: reason.id,
        originalItems: dto.originalItems as unknown as Prisma.InputJsonValue,
        desiredItems: dto.desiredItems as unknown as Prisma.InputJsonValue,
        comments: dto.comments,
      },
      include: { reason: true },
    });

    await this.transition(order.id, order.status, "exchange_requested", "customer", userId, `Exchange requested: ${reason.label}`);

    await this.audit.log({
      userId,
      action: "ExchangeRequested",
      entityType: "exchange_request",
      entityId: created.id,
      metadata: { orderId, reasonCode: dto.reasonCode },
    });

    return this.toExchangeSummary(created);
  }

  async getInvoice(orderId: string, userId: string): Promise<OrderInvoiceSummary> {
    const order = await this.loadOwnedOrder(orderId, userId);
    if (order.status === "pending_payment" || order.status === "failed") {
      throw new ValidationError("Invoice is available only for confirmed orders");
    }
    const invoice = await this.ensureInvoice(order);
    return this.toInvoiceSummary(invoice, order.id);
  }

  async getInvoiceHtml(orderId: string, userId: string): Promise<string> {
    const order = await this.loadOwnedOrder(orderId, userId);
    const invoice = await this.ensureInvoice(order);
    return this.renderInvoiceHtml(order, invoice);
  }

  async listReturnReasons(): Promise<ReasonOption[]> {
    const reasons = await this.prisma.returnReason.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return reasons.map((r) => ({ id: r.id, code: r.code, label: r.label }));
  }

  async listExchangeReasons(): Promise<ReasonOption[]> {
    const reasons = await this.prisma.exchangeReason.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return reasons.map((r) => ({ id: r.id, code: r.code, label: r.label }));
  }

  async listCouriers() {
    const couriers = await this.prisma.courier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return couriers.map((c) => ({ id: c.id, code: c.code, name: c.name }));
  }

  async trackByShipmentNumber(shipmentNumber: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { shipmentNumber },
      include: { courier: true, events: { orderBy: { occurredAt: "asc" } }, order: true },
    });
    if (!shipment) throw new NotFoundError("Shipment not found");

    return {
      orderNumber: shipment.order.orderNumber,
      ...this.toShipmentSummaryFromModel(shipment, shipment.events),
    };
  }

  // ---------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------

  async adminList(query: ListOrdersQueryDto): Promise<AdminOrderListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
          user: { select: { email: true, displayName: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((order) => ({
        ...this.toSummary(order),
        customerEmail: order.user?.email ?? null,
        customerName: order.user?.displayName ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async adminGetDetail(orderId: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { ...ORDER_WITH_RELATIONS, user: { select: { email: true, displayName: true } } },
    });
    if (!order) throw new NotFoundError("Order not found");

    const detail = await this.toDetail(order);
    return {
      ...detail,
      customerEmail: order.user?.email ?? null,
      customerName: order.user?.displayName ?? null,
      userId: order.userId,
    };
  }

  async adminUpdateStatus(orderId: string, dto: UpdateOrderStatusDto, adminId: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");

    assertTransition(order.status, dto.status);
    await this.transition(order.id, order.status, dto.status, "admin", adminId, dto.note);

    await this.audit.log({
      userId: adminId,
      action: "AdminOrderStatusUpdated",
      entityType: "order",
      entityId: order.id,
      metadata: { from: order.status, to: dto.status, note: dto.note },
    });

    return this.adminGetDetail(orderId);
  }

  async adminCreateShipment(orderId: string, dto: CreateShipmentDto, adminId: string): Promise<ShipmentSummary> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== "confirmed" && order.status !== "processing") {
      throw new ValidationError("Order must be confirmed before creating a shipment");
    }

    const lineItems = this.lineItemsOf(order);
    let courierId: string | null = null;
    if (dto.courierCode) {
      const courier = await this.prisma.courier.findUnique({ where: { code: dto.courierCode } });
      if (!courier) throw new ValidationError("Unknown courier code");
      courierId = courier.id;
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        shipmentNumber: generateShipmentNumber(),
        orderId,
        courierId,
        trackingNumber: dto.trackingNumber,
        estimatedDeliveryAt: dto.estimatedDeliveryAt ? new Date(dto.estimatedDeliveryAt) : null,
        shippedAt: new Date(),
        items: {
          create: dto.items.map((item) => ({
            variantSku: item.variantSku,
            quantity: item.quantity,
            productName:
              lineItems.find((li) => li.variantSku === item.variantSku)?.product?.title ?? item.variantSku,
          })),
        },
        events: {
          create: [
            {
              status: "pending",
              description: "Shipment created",
              occurredAt: new Date(),
            },
          ],
        },
      },
      include: { courier: true, items: true, events: { orderBy: { occurredAt: "asc" } } },
    });

    if (order.status !== "processing") {
      await this.transition(order.id, order.status, "processing", "admin", adminId, "Shipment created");
    }
    await this.transition(order.id, "processing", "shipped", "admin", adminId, `Shipped via ${dto.courierCode ?? "courier"}`);

    await this.audit.log({
      userId: adminId,
      action: "ShipmentCreated",
      entityType: "shipment",
      entityId: shipment.id,
      metadata: { orderId, trackingNumber: dto.trackingNumber },
    });

    void this.notifications.notifyShipmentUpdated(order, {
      shipmentNumber: shipment.shipmentNumber,
      trackingNumber: shipment.trackingNumber,
    });
    return this.toShipmentSummaryFromModel(shipment, shipment.events);
  }

  async adminAddTrackingEvent(shipmentId: string, dto: AddTrackingEventDto, adminId: string): Promise<ShipmentSummary> {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundError("Shipment not found");

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    await this.prisma.trackingEvent.create({
      data: { shipmentId, status: dto.status, description: dto.description, location: dto.location, occurredAt },
    });

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: dto.status,
        deliveredAt: dto.status === "delivered" ? occurredAt : shipment.deliveredAt,
      },
      include: { courier: true, items: true, events: { orderBy: { occurredAt: "asc" } } },
    });

    if (dto.status === "delivered") {
      const order = await this.prisma.order.findUniqueOrThrow({ where: { id: shipment.orderId } });
      if (order.status === "shipped") {
        await this.transition(order.id, "shipped", "delivered", "admin", adminId, "Delivered");
      }
    }

    await this.audit.log({
      userId: adminId,
      action: "TrackingEventAdded",
      entityType: "shipment",
      entityId: shipmentId,
      metadata: { status: dto.status, location: dto.location },
    });

    return this.toShipmentSummaryFromModel(updated, updated.events);
  }

  async adminResolveReturn(returnId: string, dto: ResolveReturnDto, adminId: string): Promise<ReturnRequestSummary> {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { reason: true },
    });
    if (!returnRequest) throw new NotFoundError("Return request not found");

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: returnRequest.orderId } });

    switch (dto.action) {
      case "approve": {
        if (returnRequest.status !== "requested") throw new ValidationError("Return is not pending approval");
        const updated = await this.prisma.returnRequest.update({
          where: { id: returnId },
          data: { status: "approved", refundAmount: dto.refundAmount ?? order.total },
          include: { reason: true },
        });
        await this.audit.log({ userId: adminId, action: "ReturnApproved", entityType: "return_request", entityId: returnId });
        void this.notifications.notifyReturnUpdated(order, updated.status);
        return this.toReturnSummary(updated);
      }
      case "reject": {
        if (returnRequest.status !== "requested") throw new ValidationError("Return is not pending approval");
        const updated = await this.prisma.returnRequest.update({
          where: { id: returnId },
          data: { status: "rejected", resolvedAt: new Date() },
          include: { reason: true },
        });
        await this.transition(order.id, order.status, "delivered", "admin", adminId, dto.note ?? "Return rejected");
        await this.audit.log({ userId: adminId, action: "ReturnRejected", entityType: "return_request", entityId: returnId });
        void this.notifications.notifyReturnUpdated(order, updated.status);
        return this.toReturnSummary(updated);
      }
      case "receive": {
        if (returnRequest.status !== "approved") throw new ValidationError("Return has not been approved yet");
        const updated = await this.prisma.returnRequest.update({
          where: { id: returnId },
          data: { status: "item_received" },
          include: { reason: true },
        });
        await this.audit.log({ userId: adminId, action: "ReturnItemReceived", entityType: "return_request", entityId: returnId });
        void this.notifications.notifyReturnUpdated(order, updated.status);
        return this.toReturnSummary(updated);
      }
      case "refund": {
        if (returnRequest.status !== "item_received") throw new ValidationError("Item must be received before refunding");
        const payment = await this.prisma.payment.findFirst({
          where: { orderId: order.id, status: "captured" },
          orderBy: { createdAt: "desc" },
        });
        if (!payment) throw new ValidationError("No captured payment found for this order");

        const refundAmount = dto.refundAmount ?? returnRequest.refundAmount?.toString() ?? order.total.toString();
        await this.prisma.refundRequest.create({
          data: {
            paymentId: payment.id,
            orderId: order.id,
            returnRequestId: returnId,
            amount: refundAmount,
            reason: `Return: ${returnRequest.reason.label}`,
            status: "completed",
            completedAt: new Date(),
          },
        });

        const updated = await this.prisma.returnRequest.update({
          where: { id: returnId },
          data: { status: "refunded", resolvedAt: new Date() },
          include: { reason: true },
        });
        await this.transition(order.id, order.status, "returned", "admin", adminId, "Refund completed");
        await this.audit.log({ userId: adminId, action: "ReturnRefunded", entityType: "return_request", entityId: returnId, metadata: { amount: refundAmount } });
        void this.notifications.notifyReturnUpdated(order, updated.status);
        return this.toReturnSummary(updated);
      }
      default:
        throw new ValidationError("Unsupported action");
    }
  }

  async adminResolveExchange(exchangeId: string, dto: ResolveExchangeDto, adminId: string): Promise<ExchangeRequestSummary> {
    const exchangeRequest = await this.prisma.exchangeRequest.findUnique({
      where: { id: exchangeId },
      include: { reason: true },
    });
    if (!exchangeRequest) throw new NotFoundError("Exchange request not found");

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: exchangeRequest.orderId } });

    switch (dto.action) {
      case "approve": {
        if (exchangeRequest.status !== "requested") throw new ValidationError("Exchange is not pending approval");
        const updated = await this.prisma.exchangeRequest.update({
          where: { id: exchangeId },
          data: { status: "approved" },
          include: { reason: true },
        });
        await this.audit.log({ userId: adminId, action: "ExchangeApproved", entityType: "exchange_request", entityId: exchangeId });
        return this.toExchangeSummary(updated);
      }
      case "reject": {
        if (exchangeRequest.status !== "requested") throw new ValidationError("Exchange is not pending approval");
        const updated = await this.prisma.exchangeRequest.update({
          where: { id: exchangeId },
          data: { status: "rejected", resolvedAt: new Date() },
          include: { reason: true },
        });
        await this.transition(order.id, order.status, "delivered", "admin", adminId, dto.note ?? "Exchange rejected");
        await this.audit.log({ userId: adminId, action: "ExchangeRejected", entityType: "exchange_request", entityId: exchangeId });
        return this.toExchangeSummary(updated);
      }
      case "receive": {
        if (exchangeRequest.status !== "approved") throw new ValidationError("Exchange has not been approved yet");
        const updated = await this.prisma.exchangeRequest.update({
          where: { id: exchangeId },
          data: { status: "item_received" },
          include: { reason: true },
        });
        await this.audit.log({ userId: adminId, action: "ExchangeItemReceived", entityType: "exchange_request", entityId: exchangeId });
        return this.toExchangeSummary(updated);
      }
      case "complete": {
        if (exchangeRequest.status !== "item_received") throw new ValidationError("Item must be received before completing the exchange");
        const updated = await this.prisma.exchangeRequest.update({
          where: { id: exchangeId },
          data: { status: "exchanged", resolvedAt: new Date() },
          include: { reason: true },
        });
        await this.transition(order.id, order.status, "exchanged", "admin", adminId, dto.note ?? "Exchange completed");
        await this.audit.log({ userId: adminId, action: "ExchangeCompleted", entityType: "exchange_request", entityId: exchangeId });
        return this.toExchangeSummary(updated);
      }
      default:
        throw new ValidationError("Unsupported action");
    }
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async loadOwnedOrder(orderId: string, userId: string): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_WITH_RELATIONS,
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundError("Order not found");
    }
    return order;
  }

  private lineItemsOf(order: { lineItems: Prisma.JsonValue }): LineItemSnapshot[] {
    return Array.isArray(order.lineItems) ? (order.lineItems as unknown as LineItemSnapshot[]) : [];
  }

  private deliveredAtOf(order: OrderWithRelations): Date | null {
    const delivered = order.shipments
      .flatMap((s) => (s.deliveredAt ? [s.deliveredAt] : []))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return delivered ?? null;
  }

  private assertItemsBelongToOrder(order: OrderWithRelations, items: OrderReturnItem[]): void {
    const lineItems = this.lineItemsOf(order);
    for (const item of items) {
      const match = lineItems.find((li) => li.variantSku === item.variantSku);
      if (!match) {
        throw new ValidationError(`Item ${item.variantSku} is not part of this order`);
      }
      if (item.quantity > match.quantity) {
        throw new ValidationError(`Requested quantity for ${item.variantSku} exceeds what was purchased`);
      }
      if (item.quantity < 1) {
        throw new ValidationError("Quantity must be at least 1");
      }
    }
  }

  private async transition(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    actorType: "customer" | "admin" | "system",
    actorId: string | undefined,
    reason?: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const data: Prisma.OrderUpdateInput = { status: to, ...extra };
    await this.prisma.order.update({ where: { id: orderId }, data });
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: from,
        toStatus: to,
        reason,
        actorType,
        actorId,
      },
    });
  }

  private async ensureInvoice(order: { id: string; orderNumber: string; subtotal: Prisma.Decimal; discount: Prisma.Decimal; shippingFee: Prisma.Decimal; taxAmount: Prisma.Decimal; total: Prisma.Decimal; currency: string; invoice?: { id: string } | null }) {
    if (order.invoice) {
      return this.prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } });
    }
    const existing = await this.prisma.invoice.findUnique({ where: { orderId: order.id } });
    if (existing) return existing;

    try {
      return await this.prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: generateInvoiceNumber(order.orderNumber),
          subtotal: order.subtotal,
          discount: order.discount,
          shippingFee: order.shippingFee,
          taxAmount: order.taxAmount,
          total: order.total,
          currency: order.currency,
        },
      });
    } catch {
      return this.prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } });
    }
  }

  private renderInvoiceHtml(
    order: OrderWithRelations,
    invoice: { invoiceNumber: string; issuedAt: Date; subtotal: Prisma.Decimal; discount: Prisma.Decimal; shippingFee: Prisma.Decimal; taxAmount: Prisma.Decimal; total: Prisma.Decimal; currency: string },
  ): string {
    const address = order.shippingAddress as unknown as OrderShippingAddress;
    const items = this.lineItemsOf(order);
    const rows = items
      .map((item) => {
        const title = escapeHtml(item.product?.title ?? item.variantSku);
        const variant = item.variantLabel ? ` (${escapeHtml(item.variantLabel)})` : "";
        return `
        <tr>
          <td>${title}${variant}</td>
          <td>${escapeHtml(item.variantSku)}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">₹${item.unitPrice}</td>
        </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: left; }
  .totals td { border: none; }
  .totals tr td:first-child { text-align: right; font-weight: 600; }
  .totals tr td:last-child { text-align: right; }
</style>
</head>
<body>
  <h1>ECOM — Tax Invoice</h1>
  <p>Invoice Number: <strong>${escapeHtml(invoice.invoiceNumber)}</strong><br/>
  Order Number: <strong>${escapeHtml(order.orderNumber)}</strong><br/>
  Issued: ${invoice.issuedAt.toLocaleDateString("en-IN")}</p>
  <p><strong>Ship to:</strong><br/>
  ${escapeHtml(address.fullName)}<br/>
  ${escapeHtml(address.line1)}${address.line2 ? `, ${escapeHtml(address.line2)}` : ""}<br/>
  ${escapeHtml(address.city)}, ${escapeHtml(address.state)} — ${escapeHtml(address.postalCode)}<br/>
  ${escapeHtml(address.phone)}</p>
  <table>
    <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit Price</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td>₹${invoice.subtotal}</td></tr>
    <tr><td>Discount</td><td>-₹${invoice.discount}</td></tr>
    <tr><td>Shipping</td><td>₹${invoice.shippingFee}</td></tr>
    <tr><td>Tax (GST)</td><td>₹${invoice.taxAmount}</td></tr>
    <tr><td>Total</td><td>₹${invoice.total}</td></tr>
  </table>
</body>
</html>`;
  }

  private toSummary(order: OrderModel & { payments: { status: string }[] }): CustomerOrderSummary {
    const items = this.lineItemsOf(order);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as CustomerOrderSummary["status"],
      total: order.total.toString(),
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.payments[0]?.status ?? null,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    };
  }

  private async toDetail(order: OrderWithRelations): Promise<OrderDetail> {
    const summary = this.toSummary(order);
    const deliveredAt = this.deliveredAtOf(order);
    const invoice = order.invoice ? this.toInvoiceSummary(order.invoice, order.id) : null;

    return {
      ...summary,
      address: order.shippingAddress as unknown as OrderShippingAddress,
      items: this.lineItemsOf(order) as unknown as OrderDetail["items"],
      timeline: order.statusHistory.map((h) => this.toStatusEvent(h)),
      shipments: order.shipments.map((s) => this.toShipmentSummaryFromModel(s, s.events)),
      returnRequests: order.returnRequests.map((r) => this.toReturnSummary(r)),
      exchangeRequests: order.exchangeRequests.map((e) => this.toExchangeSummary(e)),
      invoice,
      actions: {
        cancellable: isCancellable(order.status),
        returnEligible: isReturnEligible(order.status, deliveredAt),
        exchangeEligible: isExchangeEligible(order.status, deliveredAt),
        returnWindowEndsAt: returnWindowEndsAt(deliveredAt)?.toISOString() ?? null,
        exchangeWindowEndsAt: exchangeWindowEndsAt(deliveredAt)?.toISOString() ?? null,
      },
    };
  }

  private toStatusEvent(history: { fromStatus: OrderStatus | null; toStatus: OrderStatus; reason: string | null; actorType: string; createdAt: Date }): OrderStatusEvent {
    return {
      fromStatus: history.fromStatus as OrderStatusEvent["fromStatus"],
      toStatus: history.toStatus as OrderStatusEvent["toStatus"],
      reason: history.reason,
      actorType: history.actorType as OrderStatusEvent["actorType"],
      createdAt: history.createdAt.toISOString(),
    };
  }

  private toShipmentSummaryFromModel(
    shipment: ShipmentModel & { courier?: { name: string; trackingUrlTemplate: string | null } | null; items?: ShipmentItemModel[] },
    events: TrackingEventModel[],
  ): ShipmentSummary {
    const trackingUrl =
      shipment.courier?.trackingUrlTemplate && shipment.trackingNumber
        ? shipment.courier.trackingUrlTemplate.replace("{trackingNumber}", shipment.trackingNumber)
        : null;

    return {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status as ShipmentStatus,
      courierName: shipment.courier?.name ?? null,
      trackingNumber: shipment.trackingNumber,
      trackingUrl,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt?.toISOString() ?? null,
      shippedAt: shipment.shippedAt?.toISOString() ?? null,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
      events: events.map((e) => this.toTrackingEvent(e)),
    };
  }

  private toTrackingEvent(event: TrackingEventModel): TrackingEventSummary {
    return {
      status: event.status as ShipmentStatus,
      description: event.description,
      location: event.location,
      occurredAt: event.occurredAt.toISOString(),
    };
  }

  private toReturnSummary(
    request: ReturnRequestModel & { reason: { code: string; label: string } },
  ): ReturnRequestSummary {
    return {
      id: request.id,
      orderId: request.orderId,
      status: request.status,
      reasonCode: request.reason.code,
      reasonLabel: request.reason.label,
      items: request.items as unknown as OrderReturnItem[],
      comments: request.comments,
      refundAmount: request.refundAmount?.toString() ?? null,
      requestedAt: request.requestedAt.toISOString(),
      resolvedAt: request.resolvedAt?.toISOString() ?? null,
    };
  }

  private toExchangeSummary(
    request: ExchangeRequestModel & { reason: { code: string; label: string } },
  ): ExchangeRequestSummary {
    return {
      id: request.id,
      orderId: request.orderId,
      status: request.status,
      reasonCode: request.reason.code,
      reasonLabel: request.reason.label,
      originalItems: request.originalItems as unknown as OrderReturnItem[],
      desiredItems: request.desiredItems as unknown as OrderReturnItem[],
      comments: request.comments,
      requestedAt: request.requestedAt.toISOString(),
      resolvedAt: request.resolvedAt?.toISOString() ?? null,
    };
  }

  private toInvoiceSummary(
    invoice: { invoiceNumber: string; issuedAt: Date; total: Prisma.Decimal; currency: string },
    orderId: string,
  ): OrderInvoiceSummary {
    return {
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt.toISOString(),
      total: invoice.total.toString(),
      currency: invoice.currency,
      viewUrl: `/api/v1/orders/${orderId}/invoice/view`,
    };
  }
}
