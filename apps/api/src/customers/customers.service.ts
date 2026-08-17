import { NotFoundError, ValidationError } from "@ecom/shared";
import type {
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCustomerListResult,
  CustomerSupportNote,
  CustomerTimelineEvent,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { ListCustomersQueryDto } from "./dto/list-customers-query.dto";

const NON_PAID_ORDER_STATUSES = ["pending_payment", "cancelled", "failed"] as const;
const ALLOWED_STATUS_UPDATES = ["active", "suspended"] as const;
const CUSTOMER_ROLE = "customer";
const DEFAULT_PAGE_SIZE = 20;
const DETAIL_HISTORY_TAKE = 20;
const TIMELINE_CAP = 50;

const CUSTOMER_DETAIL_INCLUDE = {
  profile: true,
  addresses: { orderBy: [{ isDefault: "desc" as const }, { createdAt: "desc" as const }] },
  orders: {
    orderBy: { createdAt: "desc" as const },
    take: DETAIL_HISTORY_TAKE,
    select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
  },
  returnRequests: {
    orderBy: { createdAt: "desc" as const },
    take: DETAIL_HISTORY_TAKE,
    select: { id: true, status: true, createdAt: true },
  },
  reviews: {
    orderBy: { createdAt: "desc" as const },
    take: DETAIL_HISTORY_TAKE,
    select: { id: true, productId: true, rating: true, title: true, status: true, createdAt: true },
  },
  loyaltyAccount: true,
  supportNotes: {
    orderBy: { createdAt: "desc" as const },
    include: { author: { select: { email: true } } },
  },
} satisfies Prisma.UserInclude;

type CustomerDetailRow = Prisma.UserGetPayload<{ include: typeof CUSTOMER_DETAIL_INCLUDE }>;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListCustomersQueryDto): Promise<AdminCustomerListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.buildListWhere(query);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { orders: true } },
          orders: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const ids = users.map((user) => user.id);
    const lifetimeByUser = new Map<string, string>();

    if (ids.length > 0) {
      const paid = await this.prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: { in: ids },
          status: { notIn: [...NON_PAID_ORDER_STATUSES] },
        },
        _sum: { total: true },
      });
      for (const row of paid) {
        if (!row.userId) continue;
        lifetimeByUser.set(row.userId, moneyString(row._sum.total));
      }
    }

    const customers: AdminCustomerListItem[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      status: user.status,
      orderCount: user._count.orders,
      lifetimeValue: lifetimeByUser.get(user.id) ?? "0.00",
      lastOrderAt: user.orders[0]?.createdAt.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    }));

    return { customers, total, page, pageSize };
  }

  async getById(id: string): Promise<AdminCustomerDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: CUSTOMER_DETAIL_INCLUDE,
    });
    if (!user) throw new NotFoundError("Customer not found");

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityId: id,
        entityType: { in: ["user", "customer"] },
      },
      orderBy: { createdAt: "desc" },
      take: TIMELINE_CAP,
    });

    return this.toDetail(user, auditLogs);
  }

  async addNote(actorId: string, customerId: string, body: string): Promise<AdminCustomerDetail> {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    await this.prisma.customerSupportNote.create({
      data: { userId: customerId, authorId: actorId, body },
    });

    await this.audit.log({
      userId: actorId,
      action: "customer.note_added",
      entityType: "user",
      entityId: customerId,
      metadata: { bodyLength: body.length },
    });

    return this.getById(customerId);
  }

  async updateStatus(
    actorId: string,
    customerId: string,
    status: "active" | "suspended",
  ): Promise<AdminCustomerDetail> {
    if (!ALLOWED_STATUS_UPDATES.includes(status)) {
      throw new ValidationError("Status must be active or suspended");
    }

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, status: true },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    await this.prisma.user.update({
      where: { id: customerId },
      data: { status },
    });

    await this.audit.log({
      userId: actorId,
      action: "customer.status_changed",
      entityType: "user",
      entityId: customerId,
      before: { status: customer.status },
      after: { status },
    });

    return this.getById(customerId);
  }

  private buildListWhere(query: ListCustomersQueryDto): Prisma.UserWhereInput {
    const customerScope: Prisma.UserWhereInput = {
      OR: [
        { roles: { some: { role: { name: CUSTOMER_ROLE } } } },
        { orders: { some: {} } },
      ],
    };

    const filters: Prisma.UserWhereInput[] = [customerScope];

    if (query.status) {
      filters.push({ status: query.status });
    }

    const q = query.q?.trim();
    if (q) {
      filters.push({
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    return { AND: filters };
  }

  private toDetail(
    user: CustomerDetailRow,
    auditLogs: Array<{
      id: string;
      action: string;
      createdAt: Date;
      before: unknown;
      after: unknown;
    }>,
  ): AdminCustomerDetail {
    const notes: CustomerSupportNote[] = user.supportNotes.map((note) => ({
      id: note.id,
      body: note.body,
      authorId: note.authorId,
      authorEmail: note.author.email,
      createdAt: note.createdAt.toISOString(),
    }));

    const orders = user.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: moneyString(order.total),
      createdAt: order.createdAt.toISOString(),
    }));

    const returns = user.returnRequests.map((item) => ({
      id: item.id,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    }));

    const reviews = user.reviews.map((review) => ({
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      title: review.title,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
    }));

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      profile: { preferences: asPreferences(user.profile?.preferences) },
      addresses: user.addresses.map((address) => ({
        id: address.id,
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault,
      })),
      orders,
      returns,
      reviews,
      loyaltyPoints: user.loyaltyAccount?.pointsBalance ?? 0,
      notes,
      timeline: buildTimeline({ orders, returns, reviews, notes, auditLogs }),
    };
  }
}

function buildTimeline(input: {
  orders: Array<{ id: string; orderNumber: string; status: string; total: string; createdAt: string }>;
  returns: Array<{ id: string; status: string; createdAt: string }>;
  reviews: Array<{ id: string; rating: number; title: string | null; createdAt: string }>;
  notes: CustomerSupportNote[];
  auditLogs: Array<{ id: string; action: string; createdAt: Date; before: unknown; after: unknown }>;
}): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];

  for (const order of input.orders) {
    events.push({
      id: `order:${order.id}`,
      kind: "order",
      title: `Order ${order.orderNumber}`,
      detail: `${order.status} · ${order.total}`,
      createdAt: order.createdAt,
    });
  }

  for (const item of input.returns) {
    events.push({
      id: `return:${item.id}`,
      kind: "return",
      title: "Return request",
      detail: item.status,
      createdAt: item.createdAt,
    });
  }

  for (const review of input.reviews) {
    events.push({
      id: `review:${review.id}`,
      kind: "review",
      title: review.title ?? "Product review",
      detail: `Rating ${review.rating}/5`,
      createdAt: review.createdAt,
    });
  }

  for (const note of input.notes) {
    events.push({
      id: `note:${note.id}`,
      kind: "note",
      title: "Support note",
      detail: note.body,
      createdAt: note.createdAt,
    });
  }

  for (const log of input.auditLogs) {
    const isStatus = log.action === "customer.status_changed";
    events.push({
      id: `audit:${log.id}`,
      kind: isStatus ? "status" : "audit",
      title: isStatus ? "Status changed" : log.action,
      detail: timelineAuditDetail(log),
      createdAt: log.createdAt.toISOString(),
    });
  }

  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return events.slice(0, TIMELINE_CAP);
}

function timelineAuditDetail(log: { before: unknown; after: unknown }): string | undefined {
  const after = asRecord(log.after);
  const before = asRecord(log.before);
  if (after?.status && before?.status) {
    return `${String(before.status)} → ${String(after.status)}`;
  }
  if (after?.status) return String(after.status);
  return undefined;
}

function asPreferences(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  return record ?? {};
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function moneyString(value: { toString(): string } | number | null | undefined): string {
  if (value == null) return "0.00";
  if (typeof value === "number") return value.toFixed(2);
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}
