import { AnalyticsJobsService } from "./analytics-jobs.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("AnalyticsJobsService", () => {
  let service: AnalyticsJobsService;
  let prisma: {
    $queryRaw: jest.Mock;
    analyticsDailyAggregate: { upsert: jest.Mock };
    analyticsEvent: { deleteMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      analyticsDailyAggregate: { upsert: jest.fn().mockResolvedValue({}) },
      analyticsEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    service = new AnalyticsJobsService(prisma as unknown as PrismaService);
  });

  it("upserts a daily aggregate row per metric", async () => {
    prisma.$queryRaw.mockResolvedValue([
      { day: new Date("2026-08-29T00:00:00.000Z"), metric: "page_view", count: 12, unique_sessions: 7 },
    ]);

    await service.rollupDailyAggregates();

    expect(prisma.analyticsDailyAggregate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ metric: "page_view", count: 12, uniqueSessions: 7 }),
      }),
    );
  });

  it("deletes events older than the retention window", async () => {
    prisma.analyticsEvent.deleteMany.mockResolvedValue({ count: 3 });
    await service.purgeExpiredEvents();
    expect(prisma.analyticsEvent.deleteMany).toHaveBeenCalled();
  });
});
