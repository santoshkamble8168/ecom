import { ValidationError } from "@ecom/shared";
import type {
  DashboardActivityItem,
  DashboardAlert,
  DashboardChart,
  DashboardChartPoint,
  DashboardKpi,
  DashboardSnapshot,
} from "@ecom/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type DashboardMetrics = {
  revenueToday: number;
  revenueMonth: number;
  ordersToday: number;
  ordersMonth: number;
  paidOrdersInRange: number;
  checkoutsInRange: number;
  preparedCheckoutsInRange: number;
  returnsInRange: number;
  completedRefundsInRange: number;
  capturedPaymentsInRange: number;
  activeUsers: number;
  inventoryAlerts: number;
  failedPaymentsToday: number;
  searchNoResultsToday: number;
  pendingReturns: number;
  dailyRevenue: Record<string, number>;
  dailyOrders: Record<string, number>;
};

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveDashboardRange(
  from?: string,
  to?: string,
  now: Date = new Date(),
): { from: Date; to: Date } {
  const toDate = to ? parseIsoBound(to, "end") : now;
  const fromDate = from
    ? parseIsoBound(from, "start")
    : new Date(startOfUtcDay(now).getTime() - (CHART_DAYS - 1) * MS_PER_DAY);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new ValidationError("Dashboard range `from` must be before `to`");
  }

  return { from: fromDate, to: toDate };
}

export function chartWindow(now: Date): { from: Date; to: Date } {
  return {
    from: new Date(startOfUtcDay(now).getTime() - (CHART_DAYS - 1) * MS_PER_DAY),
    to: now,
  };
}

/** Month revenue / month paid order count. Zero when there are no paid orders. */
export function computeAov(revenue: number, orderCount: number): number {
  return orderCount === 0 ? 0 : revenue / orderCount;
}

/** Paid orders / checkout sessions created. Zero when there are no checkouts. */
export function computeConversionRate(paidOrders: number, checkouts: number): number {
  return checkouts === 0 ? 0 : paidOrders / checkouts;
}

/** 1 − (order_prepared checkouts / checkouts created). Zero when there are no checkouts. */
export function computeAbandonmentRate(preparedCheckouts: number, checkouts: number): number {
  return checkouts === 0 ? 0 : 1 - preparedCheckouts / checkouts;
}

export function computeReturnRate(returns: number, paidOrders: number): number {
  return paidOrders === 0 ? 0 : returns / paidOrders;
}

export function computeRefundRate(completedRefunds: number, capturedPayments: number): number {
  return capturedPayments === 0 ? 0 : completedRefunds / capturedPayments;
}

export function formatInr(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}₹${grouped}.${fraction}`;
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function fillDailyPoints(
  from: Date,
  to: Date,
  values: Record<string, number>,
): DashboardChartPoint[] {
  const points: DashboardChartPoint[] = [];
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  while (cursor.getTime() <= end.getTime()) {
    const date = utcDateKey(cursor);
    points.push({ date, value: values[date] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

export function buildDashboardSnapshot(input: {
  generatedAt: Date;
  range: { from: Date; to: Date };
  metrics: DashboardMetrics;
  activity: DashboardActivityItem[];
}): DashboardSnapshot {
  const { generatedAt, range, metrics, activity } = input;
  const aov = computeAov(metrics.revenueMonth, metrics.ordersMonth);
  const conversion = computeConversionRate(metrics.paidOrdersInRange, metrics.checkoutsInRange);
  const abandonment = computeAbandonmentRate(
    metrics.preparedCheckoutsInRange,
    metrics.checkoutsInRange,
  );
  const returnRate = computeReturnRate(metrics.returnsInRange, metrics.paidOrdersInRange);
  const refundRate = computeRefundRate(
    metrics.completedRefundsInRange,
    metrics.capturedPaymentsInRange,
  );
  const chartRange = chartWindow(generatedAt);

  return {
    generatedAt: generatedAt.toISOString(),
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    kpis: buildKpis({
      metrics,
      aov,
      conversion,
      abandonment,
      returnRate,
      refundRate,
    }),
    charts: buildCharts(chartRange, metrics),
    alerts: buildAlerts(metrics, abandonment),
    activity,
  };
}

function parseIsoBound(value: string, bound: "start" | "end"): Date {
  if (DATE_ONLY.test(value)) {
    return new Date(`${value}T${bound === "start" ? "00:00:00.000" : "23:59:59.999"}Z`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError("Invalid dashboard date range");
  }
  return parsed;
}

function buildKpis(input: {
  metrics: DashboardMetrics;
  aov: number;
  conversion: number;
  abandonment: number;
  returnRate: number;
  refundRate: number;
}): DashboardKpi[] {
  const { metrics, aov, conversion, abandonment, returnRate, refundRate } = input;

  return [
    {
      key: "revenue_today",
      label: "Revenue today",
      value: formatInr(metrics.revenueToday),
      definition: "SUM(total) of paid orders confirmed or created today UTC",
    },
    {
      key: "revenue_month",
      label: "Revenue this month",
      value: formatInr(metrics.revenueMonth),
      definition: "SUM(total) of paid orders confirmed or created this UTC month",
    },
    {
      key: "orders_today",
      label: "Orders today",
      value: String(metrics.ordersToday),
      definition: "Count of paid orders confirmed or created today UTC",
    },
    {
      key: "aov",
      label: "Average order value",
      value: metrics.ordersMonth === 0 ? "0" : formatInr(aov),
      definition: "Month paid revenue ÷ month paid order count",
    },
    {
      key: "conversion",
      label: "Conversion rate",
      value: formatPercent(conversion),
      definition: "Paid orders in range ÷ checkout sessions created in range",
    },
    {
      key: "cart_abandonment",
      label: "Cart abandonment",
      value: metrics.checkoutsInRange === 0 ? "0" : formatPercent(abandonment),
      definition: "1 − (order_prepared checkouts ÷ checkouts created in range)",
      tone: abandonment >= 0.5 ? "warning" : undefined,
    },
    {
      key: "return_rate",
      label: "Return rate",
      value: formatPercent(returnRate),
      definition: "Return requests created in range ÷ paid orders in range",
    },
    {
      key: "refund_rate",
      label: "Refund rate",
      value: formatPercent(refundRate),
      definition: "Completed refunds in range ÷ captured payments in range",
    },
    {
      key: "active_users",
      label: "Active users",
      value: String(metrics.activeUsers),
      definition: "Distinct customers with a paid order in the last 30 days",
    },
    {
      key: "inventory_alerts",
      label: "Inventory alerts",
      value: String(metrics.inventoryAlerts),
      definition: "Stock items where on-hand − reserved ≤ low-stock threshold",
      tone: metrics.inventoryAlerts > 0 ? "warning" : undefined,
    },
    {
      key: "failed_payments",
      label: "Failed payments today",
      value: String(metrics.failedPaymentsToday),
      definition: "Payments with status failed created today UTC",
      tone: metrics.failedPaymentsToday > 0 ? "danger" : undefined,
    },
    {
      key: "search_no_results",
      label: "Search no-results today",
      value: String(metrics.searchNoResultsToday),
      definition: "Search logs with zero results created today UTC",
      tone: metrics.searchNoResultsToday > 0 ? "warning" : undefined,
    },
  ];
}

function buildCharts(
  range: { from: Date; to: Date },
  metrics: DashboardMetrics,
): DashboardChart[] {
  return [
    {
      key: "revenue_trend",
      label: "Revenue (14 days)",
      unit: "INR",
      points: fillDailyPoints(range.from, range.to, metrics.dailyRevenue),
    },
    {
      key: "orders_trend",
      label: "Orders (14 days)",
      unit: "orders",
      points: fillDailyPoints(range.from, range.to, metrics.dailyOrders),
    },
  ];
}

function buildAlerts(metrics: DashboardMetrics, abandonment: number): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (metrics.inventoryAlerts > 0) {
    alerts.push({
      key: "low_stock",
      severity: "warning",
      title: "Low stock",
      detail: `${metrics.inventoryAlerts} SKU(s) at or below the low-stock threshold`,
      href: "/inventory",
    });
  }

  if (metrics.failedPaymentsToday > 0) {
    alerts.push({
      key: "failed_payments",
      severity: "danger",
      title: "Failed payments today",
      detail: `${metrics.failedPaymentsToday} payment(s) failed today`,
      href: "/orders",
    });
  }

  if (metrics.pendingReturns > 0) {
    alerts.push({
      key: "pending_returns",
      severity: "warning",
      title: "Pending returns",
      detail: `${metrics.pendingReturns} return request(s) awaiting action`,
      href: "/orders",
    });
  }

  if (abandonment >= 0.5) {
    alerts.push({
      key: "cart_abandonment",
      severity: "warning",
      title: "High cart abandonment",
      detail: `Cart abandonment is ${formatPercent(abandonment)} in the selected range`,
    });
  }

  if (metrics.searchNoResultsToday > 0) {
    alerts.push({
      key: "search_no_results",
      severity: "info",
      title: "Searches with no results",
      detail: `${metrics.searchNoResultsToday} search(es) returned no results today`,
    });
  }

  return alerts;
}
