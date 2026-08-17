import type { ApiEnv } from "@ecom/config";
import { ValidationError } from "@ecom/shared";
import type { DashboardSnapshot } from "@ecom/types";

import type { PrismaService } from "../prisma/prisma.service";
import type { RedisService } from "../redis/redis.service";

import {
  buildDashboardSnapshot,
  computeAbandonmentRate,
  computeAov,
  computeConversionRate,
  formatInr,
  formatPercent,
  resolveDashboardRange,
  type DashboardMetrics,
} from "./dashboard-aggregates";
import { DashboardService } from "./dashboard.service";

function emptyMetrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    revenueToday: 0,
    revenueMonth: 0,
    ordersToday: 0,
    ordersMonth: 0,
    paidOrdersInRange: 0,
    checkoutsInRange: 0,
    preparedCheckoutsInRange: 0,
    returnsInRange: 0,
    completedRefundsInRange: 0,
    capturedPaymentsInRange: 0,
    activeUsers: 0,
    inventoryAlerts: 0,
    failedPaymentsToday: 0,
    searchNoResultsToday: 0,
    pendingReturns: 0,
    dailyRevenue: {},
    dailyOrders: {},
    ...overrides,
  };
}

function kpiValue(snapshot: DashboardSnapshot, key: string): string {
  const kpi = snapshot.kpis.find((item) => item.key === key);
  if (!kpi) throw new Error(`Missing KPI ${key}`);
  return kpi.value;
}

describe("dashboard KPI mapper", () => {
  const generatedAt = new Date("2026-08-17T12:00:00.000Z");
  const range = {
    from: new Date("2026-08-04T00:00:00.000Z"),
    to: new Date("2026-08-17T12:00:00.000Z"),
  };

  it("returns 0 for AOV when there are no paid orders this month", () => {
    expect(computeAov(12_500, 0)).toBe(0);

    const snapshot = buildDashboardSnapshot({
      generatedAt,
      range,
      metrics: emptyMetrics({ revenueMonth: 12_500, ordersMonth: 0 }),
      activity: [],
    });

    expect(kpiValue(snapshot, "aov")).toBe("0");
  });

  it("formats AOV as rupees when paid orders exist", () => {
    expect(computeAov(10_000, 4)).toBe(2500);

    const snapshot = buildDashboardSnapshot({
      generatedAt,
      range,
      metrics: emptyMetrics({ revenueMonth: 10_000, ordersMonth: 4 }),
      activity: [],
    });

    expect(kpiValue(snapshot, "aov")).toBe("₹2,500.00");
    expect(formatInr(1234.5)).toBe("₹1,234.50");
  });

  it("computes conversion as paid orders / checkouts with one decimal percent", () => {
    expect(computeConversionRate(5, 10)).toBe(0.5);
    expect(computeConversionRate(1, 0)).toBe(0);

    const snapshot = buildDashboardSnapshot({
      generatedAt,
      range,
      metrics: emptyMetrics({ paidOrdersInRange: 5, checkoutsInRange: 10 }),
      activity: [],
    });

    expect(kpiValue(snapshot, "conversion")).toBe("50.0%");
    expect(formatPercent(0.5)).toBe("50.0%");
  });

  it("computes cart abandonment and emits an alert at 50%+", () => {
    expect(computeAbandonmentRate(1, 4)).toBe(0.75);
    expect(computeAbandonmentRate(0, 0)).toBe(0);

    const high = buildDashboardSnapshot({
      generatedAt,
      range,
      metrics: emptyMetrics({ checkoutsInRange: 4, preparedCheckoutsInRange: 1 }),
      activity: [],
    });

    expect(kpiValue(high, "cart_abandonment")).toBe("75.0%");
    expect(high.alerts.some((alert) => alert.key === "cart_abandonment")).toBe(true);

    const none = buildDashboardSnapshot({
      generatedAt,
      range,
      metrics: emptyMetrics({ checkoutsInRange: 0, preparedCheckoutsInRange: 0 }),
      activity: [],
    });

    expect(kpiValue(none, "cart_abandonment")).toBe("0");
    expect(none.alerts.some((alert) => alert.key === "cart_abandonment")).toBe(false);
  });

  it("includes low-stock and failed-payment alerts only when counts are positive", () => {
    const snapshot = buildDashboardSnapshot({
      generatedAt,
      range,
      metrics: emptyMetrics({ inventoryAlerts: 3, failedPaymentsToday: 2, pendingReturns: 1 }),
      activity: [],
    });

    expect(snapshot.alerts.map((alert) => alert.key)).toEqual([
      "low_stock",
      "failed_payments",
      "pending_returns",
    ]);
    expect(snapshot.alerts.find((alert) => alert.key === "low_stock")?.href).toBe("/inventory");
  });
});

describe("resolveDashboardRange", () => {
  it("defaults from to 13 UTC days before today", () => {
    const now = new Date("2026-08-17T15:30:00.000Z");
    const range = resolveDashboardRange(undefined, undefined, now);

    expect(range.from.toISOString()).toBe("2026-08-04T00:00:00.000Z");
    expect(range.to.toISOString()).toBe(now.toISOString());
  });

  it("rejects an inverted range", () => {
    expect(() => resolveDashboardRange("2026-08-17", "2026-08-01")).toThrow(ValidationError);
  });
});

describe("DashboardService.getSnapshot", () => {
  let service: DashboardService;
  let prisma: {
    order: { aggregate: jest.Mock; groupBy: jest.Mock };
    checkoutSession: { count: jest.Mock };
    returnRequest: { count: jest.Mock };
    refundRequest: { count: jest.Mock };
    payment: { count: jest.Mock };
    searchLog: { count: jest.Mock };
    auditLog: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let redis: { get: jest.Mock; setex: jest.Mock };
  const env = { DASHBOARD_CACHE_TTL_SECONDS: 60 } as ApiEnv;

  beforeEach(() => {
    prisma = {
      order: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: null }, _count: { _all: 0 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      checkoutSession: { count: jest.fn().mockResolvedValue(0) },
      returnRequest: { count: jest.fn().mockResolvedValue(0) },
      refundRequest: { count: jest.fn().mockResolvedValue(0) },
      payment: { count: jest.fn().mockResolvedValue(0) },
      searchLog: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValueOnce([{ count: 0n }]).mockResolvedValueOnce([]),
    };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue("OK"),
    };

    service = new DashboardService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      env,
    );
  });

  it("returns a cached snapshot without querying the database", async () => {
    const cached: DashboardSnapshot = {
      generatedAt: "2026-08-17T00:00:00.000Z",
      range: { from: "2026-08-01T00:00:00.000Z", to: "2026-08-17T23:59:59.999Z" },
      kpis: [],
      charts: [],
      alerts: [],
      activity: [],
    };
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.getSnapshot("2026-08-01", "2026-08-17");

    expect(result).toEqual(cached);
    expect(prisma.order.aggregate).not.toHaveBeenCalled();
    expect(redis.setex).not.toHaveBeenCalled();
  });

  it("falls back to live queries when Redis get fails", async () => {
    redis.get.mockRejectedValue(new Error("ECONNREFUSED"));
    redis.setex.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await service.getSnapshot("2026-08-01", "2026-08-17");

    expect(result.kpis.length).toBeGreaterThan(0);
    expect(kpiValue(result, "aov")).toBe("0");
    expect(prisma.order.aggregate).toHaveBeenCalled();
  });

  it("uses a stable cache key when no date range is provided", async () => {
    await service.getSnapshot();

    expect(redis.get).toHaveBeenCalledWith("dashboard:v1:default");
    expect(redis.setex).toHaveBeenCalledWith(
      "dashboard:v1:default",
      60,
      expect.any(String),
    );
  });
});
