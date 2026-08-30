import type { ApiEnv } from "@ecom/config";
import {
  computeFunnel,
  funnelStepForEvent,
  isAnalyticsEventName,
  normalizeIngestEvent,
  shouldSample,
} from "@ecom/shared";
import type {
  AnalyticsEventInput,
  AnalyticsIngestResult,
  AnalyticsKpiSnapshot,
  CohortSnapshot,
  FunnelSnapshot,
  ProductAnalyticsSnapshot,
  SearchAnalyticsSnapshot,
} from "@ecom/types";
import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import {
  computeAbandonmentRate,
  computeAov,
  computeConversionRate,
  computeReturnRate,
  formatInr,
  formatPercent,
  resolveDashboardRange,
} from "../dashboard/dashboard-aggregates";
import { APP_ENV } from "../config/config.module";
import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

const NON_PAID = ["pending_payment", "cancelled", "failed"] as const;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext("AnalyticsService");
  }

  async ingest(
    events: AnalyticsEventInput[],
    userId?: string,
    source: "client" | "server" = "client",
  ): Promise<AnalyticsIngestResult> {
    if (!this.env.ANALYTICS_ENABLED) {
      return { accepted: 0, duplicates: 0, skipped: events.length };
    }

    let accepted = 0;
    let duplicates = 0;
    let skipped = 0;

    for (const raw of events) {
      const event = normalizeIngestEvent(raw);
      if (!event || !isAnalyticsEventName(event.name)) {
        skipped += 1;
        continue;
      }
      if (source === "client" && !shouldSample(event.sessionId, this.env.ANALYTICS_SAMPLE_RATE)) {
        skipped += 1;
        continue;
      }

      const occurredAt = event.occurredAt ? new Date(event.occurredAt) : new Date();
      if (Number.isNaN(occurredAt.getTime())) {
        skipped += 1;
        continue;
      }

      try {
        await this.prisma.analyticsEvent.create({
          data: {
            clientEventId: event.clientEventId,
            name: event.name,
            sessionId: event.sessionId,
            userId: userId ?? null,
            source,
            path: event.path ?? null,
            properties: (event.properties ?? {}) as Prisma.InputJsonValue,
            occurredAt,
          },
        });
        accepted += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          duplicates += 1;
          continue;
        }
        this.logger.warn(`Analytics ingest failed: ${error instanceof Error ? error.message : String(error)}`);
        skipped += 1;
      }
    }

    return { accepted, duplicates, skipped };
  }

  async trackServer(input: {
    name: AnalyticsEventInput["name"];
    sessionId?: string | null;
    userId?: string | null;
    path?: string;
    properties?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const sessionId = input.sessionId || input.userId || "server";
      await this.ingest(
        [
          {
            clientEventId: randomUUID(),
            name: input.name,
            sessionId,
            path: input.path,
            properties: input.properties,
            occurredAt: new Date().toISOString(),
          },
        ],
        input.userId ?? undefined,
        "server",
      );
    } catch (error) {
      this.logger.warn(
        `Server analytics track failed for ${input.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getKpis(from?: string, to?: string): Promise<AnalyticsKpiSnapshot> {
    const now = new Date();
    const range = resolveDashboardRange(from, to, now);
    const paidWhere = {
      createdAt: { gte: range.from, lte: range.to },
      status: { notIn: [...NON_PAID] },
    };

    const [paidAgg, checkouts, prepared, returns, searchTotal, searchZero, viewSessions, orderSessions] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: paidWhere,
          _sum: { total: true },
          _count: { _all: true },
        }),
        this.prisma.checkoutSession.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
        this.prisma.checkoutSession.count({
          where: { createdAt: { gte: range.from, lte: range.to }, status: "order_prepared" },
        }),
        this.prisma.returnRequest.count({ where: { requestedAt: { gte: range.from, lte: range.to } } }),
        this.prisma.searchLog.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
        this.prisma.searchLog.count({
          where: { createdAt: { gte: range.from, lte: range.to }, resultCount: 0 },
        }),
        this.distinctSessions("page_view", range.from, range.to),
        this.distinctSessions("order_placed", range.from, range.to),
      ]);

    const revenue = Number(paidAgg._sum.total ?? 0);
    const orders = paidAgg._count._all;
    const eventConversion = computeConversionRate(orderSessions, viewSessions);
    const checkoutConversion = computeConversionRate(orders, checkouts);
    const repeat = await this.repeatPurchaseRate(range.from, range.to);

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      kpis: [
        {
          key: "revenue",
          label: "Revenue",
          value: formatInr(revenue),
          definition: "Paid-order merchandise total (status not pending_payment / cancelled / failed), UTC range.",
        },
        {
          key: "orders",
          label: "Orders",
          value: String(orders),
          definition: "Count of paid orders in the range.",
        },
        {
          key: "aov",
          label: "AOV",
          value: formatInr(computeAov(revenue, orders)),
          definition: "Revenue ÷ paid orders.",
        },
        {
          key: "conversion",
          label: "Session conversion",
          value: formatPercent(eventConversion),
          definition: "Distinct sessions with order_placed ÷ distinct sessions with page_view.",
        },
        {
          key: "checkout_conversion",
          label: "Checkout conversion",
          value: formatPercent(checkoutConversion),
          definition: "Paid orders ÷ checkout sessions started (same formula as the ops dashboard).",
        },
        {
          key: "repeat_purchase",
          label: "Repeat purchase",
          value: formatPercent(repeat),
          definition: "Buyers with ≥2 paid orders in-range ÷ buyers with ≥1 paid order.",
        },
        {
          key: "return_rate",
          label: "Return rate",
          value: formatPercent(computeReturnRate(returns, orders)),
          definition: "Return requests ÷ paid orders.",
        },
        {
          key: "cart_abandonment",
          label: "Cart abandonment",
          value: formatPercent(computeAbandonmentRate(prepared, checkouts)),
          definition: "1 − (order-prepared checkouts ÷ checkout sessions).",
        },
        {
          key: "search_success",
          label: "Search success",
          value: formatPercent(searchTotal === 0 ? 0 : 1 - searchZero / searchTotal),
          definition: "Share of SearchLog rows with resultCount > 0.",
        },
      ],
    };
  }

  async getFunnels(from?: string, to?: string): Promise<FunnelSnapshot> {
    const range = resolveDashboardRange(from, to, new Date());
    const rows = await this.prisma.analyticsEvent.findMany({
      where: {
        occurredAt: { gte: range.from, lte: range.to },
        name: { in: ["page_view", "product_view", "add_to_cart", "checkout_start", "payment_attempt", "order_placed"] },
      },
      select: { sessionId: true, name: true, path: true, occurredAt: true },
    });

    const timed = rows.flatMap((row) => {
      const step = funnelStepForEvent(row.name, row.path);
      if (!step) return [];
      return [{ sessionId: row.sessionId, step, occurredAt: row.occurredAt.getTime() }];
    });

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      steps: computeFunnel(timed),
    };
  }

  async getSearch(from?: string, to?: string): Promise<SearchAnalyticsSnapshot> {
    const range = resolveDashboardRange(from, to, new Date());
    const where = { createdAt: { gte: range.from, lte: range.to } };
    const [total, zero, grouped] = await Promise.all([
      this.prisma.searchLog.count({ where }),
      this.prisma.searchLog.count({ where: { ...where, resultCount: 0 } }),
      this.prisma.searchLog.groupBy({
        by: ["query"],
        where,
        _count: { _all: true },
        orderBy: { _count: { query: "desc" } },
        take: 20,
      }),
    ]);

    const zeroByQuery = await this.prisma.searchLog.groupBy({
      by: ["query"],
      where: { ...where, resultCount: 0 },
      _count: { _all: true },
    });
    const zeroMap = new Map(zeroByQuery.map((row) => [row.query, row._count._all]));

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      totalSearches: total,
      zeroResultRate: total === 0 ? 0 : zero / total,
      topQueries: grouped.map((row) => ({
        query: row.query,
        searches: row._count._all,
        zeroResults: zeroMap.get(row.query) ?? 0,
      })),
    };
  }

  async getProducts(from?: string, to?: string): Promise<ProductAnalyticsSnapshot> {
    const range = resolveDashboardRange(from, to, new Date());
    const rows = await this.prisma.$queryRaw<Array<{ slug: string; views: bigint; carts: bigint }>>`
      SELECT
        COALESCE(properties->>'productSlug', properties->>'slug', 'unknown') AS slug,
        COUNT(*) FILTER (WHERE name = 'product_view')::bigint AS views,
        COUNT(*) FILTER (WHERE name = 'add_to_cart')::bigint AS carts
      FROM analytics_events
      WHERE occurred_at >= ${range.from}
        AND occurred_at <= ${range.to}
        AND name IN ('product_view', 'add_to_cart')
      GROUP BY 1
      ORDER BY views DESC
      LIMIT 25
    `;

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      products: rows.map((row) => ({
        productSlug: row.slug,
        views: Number(row.views),
        addToCart: Number(row.carts),
      })),
    };
  }

  async getCohorts(from?: string, to?: string): Promise<CohortSnapshot> {
    const range = resolveDashboardRange(from, to, new Date());
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        status: { notIn: [...NON_PAID] },
        userId: { not: null },
      },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const firstByUser = new Map<string, Date>();
    const countByUser = new Map<string, number>();
    for (const order of orders) {
      if (!order.userId) continue;
      countByUser.set(order.userId, (countByUser.get(order.userId) ?? 0) + 1);
      if (!firstByUser.has(order.userId)) firstByUser.set(order.userId, order.createdAt);
    }

    const buckets = new Map<string, { customers: number; repeat: number }>();
    for (const [userId, first] of firstByUser) {
      const month = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(month) ?? { customers: 0, repeat: 0 };
      bucket.customers += 1;
      if ((countByUser.get(userId) ?? 0) >= 2) bucket.repeat += 1;
      buckets.set(month, bucket);
    }

    const cohorts = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohortMonth, bucket]) => ({
        cohortMonth,
        customers: bucket.customers,
        repeatCustomers: bucket.repeat,
        repeatRate: bucket.customers === 0 ? 0 : bucket.repeat / bucket.customers,
      }));

    return { from: range.from.toISOString(), to: range.to.toISOString(), cohorts };
  }

  private async distinctSessions(name: string, from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.analyticsEvent.findMany({
      where: { name, occurredAt: { gte: from, lte: to } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    });
    return rows.length;
  }

  private async repeatPurchaseRate(from: Date, to: Date): Promise<number> {
    const grouped = await this.prisma.order.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: from, lte: to },
        status: { notIn: [...NON_PAID] },
        userId: { not: null },
      },
      _count: { _all: true },
    });
    if (grouped.length === 0) return 0;
    const repeat = grouped.filter((row) => row._count._all >= 2).length;
    return repeat / grouped.length;
  }
}
