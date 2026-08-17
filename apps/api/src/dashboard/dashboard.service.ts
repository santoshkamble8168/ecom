import type { ApiEnv } from "@ecom/config";
import type { DashboardActivityItem, DashboardSnapshot } from "@ecom/types";
import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { APP_ENV } from "../config/config.module";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

import {
  buildDashboardSnapshot,
  chartWindow,
  resolveDashboardRange,
  startOfUtcDay,
  startOfUtcMonth,
  type DashboardMetrics,
} from "./dashboard-aggregates";

const NON_PAID_ORDER_STATUSES = ["pending_payment", "cancelled", "failed"] as const;
const ACTIVE_USER_DAYS = 30;

type PaidOrderAggregate = {
  _sum: { total: unknown };
  _count: { _all: number } | number;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  async getSnapshot(from?: string, to?: string): Promise<DashboardSnapshot> {
    const now = new Date();
    const range = resolveDashboardRange(from, to, now);
    // Default (no query range) uses a stable key so TTL caching works. An
    // explicit from/to from the admin date picker is already second-stable.
    const cacheKey =
      from || to
        ? `dashboard:v1:${range.from.toISOString()}:${range.to.toISOString()}`
        : "dashboard:v1:default";

    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const [metrics, activity] = await Promise.all([this.loadMetrics(range, now), this.loadActivity()]);
    const snapshot = buildDashboardSnapshot({ generatedAt: now, range, metrics, activity });
    await this.writeCache(cacheKey, snapshot);
    return snapshot;
  }

  private async loadMetrics(range: { from: Date; to: Date }, now: Date): Promise<DashboardMetrics> {
    const todayStart = startOfUtcDay(now);
    const monthStart = startOfUtcMonth(now);
    const activeFrom = new Date(now.getTime() - ACTIVE_USER_DAYS * 24 * 60 * 60 * 1000);
    const charts = chartWindow(now);

    const [
      todayAgg,
      monthAgg,
      rangeAgg,
      checkoutsInRange,
      preparedCheckoutsInRange,
      returnsInRange,
      completedRefundsInRange,
      capturedPaymentsInRange,
      failedPaymentsToday,
      searchNoResultsToday,
      pendingReturns,
      activeUserRows,
      inventoryRows,
      dailyRows,
    ] = await Promise.all([
      this.aggregatePaidOrders(todayStart, now),
      this.aggregatePaidOrders(monthStart, now),
      this.aggregatePaidOrders(range.from, range.to),
      this.prisma.checkoutSession.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      this.prisma.checkoutSession.count({
        where: { createdAt: { gte: range.from, lte: range.to }, status: "order_prepared" },
      }),
      this.prisma.returnRequest.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      this.prisma.refundRequest.count({
        where: { status: "completed", createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.payment.count({
        where: { status: "captured", createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.payment.count({
        where: { status: "failed", createdAt: { gte: todayStart, lte: now } },
      }),
      this.prisma.searchLog.count({
        where: { resultCount: 0, createdAt: { gte: todayStart, lte: now } },
      }),
      this.prisma.returnRequest.count({
        where: { status: { in: ["requested", "approved"] } },
      }),
      this.prisma.order.groupBy({
        by: ["userId"],
        where: { ...this.paidOrderWhere(activeFrom, now), userId: { not: null } },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM stock_items WHERE on_hand - reserved <= low_stock_threshold`,
      ),
      this.prisma.$queryRaw<Array<{ date: string; revenue: unknown; orders: unknown }>>(
        Prisma.sql`
          SELECT
            (COALESCE(confirmed_at, created_at) AT TIME ZONE 'UTC')::date::text AS date,
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*)::bigint AS orders
          FROM orders
          WHERE status NOT IN ('pending_payment', 'cancelled', 'failed')
            AND COALESCE(confirmed_at, created_at) >= ${charts.from}
            AND COALESCE(confirmed_at, created_at) <= ${now}
          GROUP BY 1
          ORDER BY 1
        `,
      ),
    ]);

    const dailyRevenue: Record<string, number> = {};
    const dailyOrders: Record<string, number> = {};
    for (const row of dailyRows) {
      if (!row.date) continue;
      dailyRevenue[row.date] = toNumber(row.revenue);
      dailyOrders[row.date] = toNumber(row.orders);
    }

    return {
      revenueToday: toNumber(todayAgg._sum.total),
      revenueMonth: toNumber(monthAgg._sum.total),
      ordersToday: countOf(todayAgg),
      ordersMonth: countOf(monthAgg),
      paidOrdersInRange: countOf(rangeAgg),
      checkoutsInRange,
      preparedCheckoutsInRange,
      returnsInRange,
      completedRefundsInRange,
      capturedPaymentsInRange,
      activeUsers: activeUserRows.filter((row) => row.userId != null).length,
      inventoryAlerts: toNumber(inventoryRows[0]?.count),
      failedPaymentsToday,
      searchNoResultsToday,
      pendingReturns,
      dailyRevenue,
      dailyOrders,
    };
  }

  private async loadActivity(): Promise<DashboardActivityItem[]> {
    const rows = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorEmail: row.user?.email ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private aggregatePaidOrders(from: Date, to: Date): Promise<PaidOrderAggregate> {
    return this.prisma.order.aggregate({
      where: this.paidOrderWhere(from, to),
      _sum: { total: true },
      _count: { _all: true },
    });
  }

  private paidOrderWhere(from: Date, to: Date): Prisma.OrderWhereInput {
    return {
      status: { notIn: [...NON_PAID_ORDER_STATUSES] },
      OR: [
        { confirmedAt: { gte: from, lte: to } },
        { confirmedAt: null, createdAt: { gte: from, lte: to } },
      ],
    };
  }

  private async readCache(key: string): Promise<DashboardSnapshot | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as DashboardSnapshot;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, snapshot: DashboardSnapshot): Promise<void> {
    try {
      await this.redis.setex(key, this.env.DASHBOARD_CACHE_TTL_SECONDS, JSON.stringify(snapshot));
    } catch {
      // Redis is optional in local dev — live query result is still returned.
    }
  }
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && "toString" in value) {
    const parsed = Number((value as { toString: () => string }).toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function countOf(agg: PaidOrderAggregate): number {
  if (typeof agg._count === "number") return agg._count;
  return agg._count._all;
}
