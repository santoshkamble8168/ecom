import type { ApiEnv } from "@ecom/config";
import { Prisma } from "@prisma/client";

import type { AppLogger } from "../logger/logger.service";
import type { PrismaService } from "../prisma/prisma.service";

import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let prisma: {
    analyticsEvent: { create: jest.Mock; findMany: jest.Mock };
    order: { aggregate: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
    checkoutSession: { count: jest.Mock };
    returnRequest: { count: jest.Mock };
    searchLog: { count: jest.Mock; groupBy: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let logger: { setContext: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    prisma = {
      analyticsEvent: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
      order: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 }, _count: { _all: 0 } }),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      checkoutSession: { count: jest.fn().mockResolvedValue(0) },
      returnRequest: { count: jest.fn().mockResolvedValue(0) },
      searchLog: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    logger = { setContext: jest.fn(), warn: jest.fn() };
    service = new AnalyticsService(
      prisma as unknown as PrismaService,
      {
        ANALYTICS_ENABLED: true,
        ANALYTICS_SAMPLE_RATE: 1,
      } as ApiEnv,
      logger as unknown as AppLogger,
    );
  });

  it("ingests a valid event", async () => {
    const result = await service.ingest(
      [
        {
          clientEventId: "11111111-1111-4111-8111-111111111111",
          name: "page_view",
          sessionId: "sess-1",
          path: "/",
        },
      ],
      undefined,
      "client",
    );

    expect(result.accepted).toBe(1);
    expect(prisma.analyticsEvent.create).toHaveBeenCalled();
  });

  it("counts unique-constraint failures as duplicates", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    });
    prisma.analyticsEvent.create.mockRejectedValue(error);

    const result = await service.ingest(
      [
        {
          clientEventId: "11111111-1111-4111-8111-111111111111",
          name: "page_view",
          sessionId: "sess-1",
        },
      ],
      undefined,
      "client",
    );

    expect(result.duplicates).toBe(1);
    expect(result.accepted).toBe(0);
  });

  it("skips unknown event names", async () => {
    const result = await service.ingest(
      [
        {
          clientEventId: "11111111-1111-4111-8111-111111111111",
          name: "not_a_real_event" as never,
          sessionId: "sess-1",
        },
      ],
      undefined,
      "client",
    );
    expect(result.skipped).toBe(1);
    expect(prisma.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("no-ops ingest when analytics is disabled", async () => {
    service = new AnalyticsService(
      prisma as unknown as PrismaService,
      { ANALYTICS_ENABLED: false, ANALYTICS_SAMPLE_RATE: 1 } as ApiEnv,
      logger as unknown as AppLogger,
    );

    const result = await service.ingest(
      [
        {
          clientEventId: "11111111-1111-4111-8111-111111111111",
          name: "page_view",
          sessionId: "sess-1",
        },
      ],
      undefined,
      "client",
    );
    expect(result.skipped).toBe(1);
    expect(prisma.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("returns KPI formulas for an empty range", async () => {
    const snapshot = await service.getKpis("2026-08-01T00:00:00.000Z", "2026-08-30T23:59:59.999Z");
    expect(snapshot.kpis.find((kpi) => kpi.key === "revenue")?.value).toBe("₹0.00");
    expect(snapshot.kpis.find((kpi) => kpi.key === "orders")?.value).toBe("0");
    expect(prisma.order.aggregate).toHaveBeenCalled();
  });
});
