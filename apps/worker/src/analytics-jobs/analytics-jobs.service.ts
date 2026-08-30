import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service";

type DailyRow = {
  day: Date;
  metric: string;
  count: number;
  unique_sessions: number;
};

/**
 * Sprint 14 — roll raw analytics events into daily aggregates and drop
 * events older than ANALYTICS_RETENTION_DAYS. Aggregation is a table scan,
 * so it runs in-process on a cron rather than through BullMQ.
 */
@Injectable()
export class AnalyticsJobsService {
  private readonly logger = new Logger(AnalyticsJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async rollupDailyAggregates(): Promise<void> {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 2);
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date();

    const rows = await this.prisma.$queryRaw<DailyRow[]>`
      SELECT
        (occurred_at AT TIME ZONE 'UTC')::date AS day,
        name AS metric,
        COUNT(*)::int AS count,
        COUNT(DISTINCT session_id)::int AS unique_sessions
      FROM analytics_events
      WHERE occurred_at >= ${from}
        AND occurred_at < ${to}
      GROUP BY 1, 2
    `;

    for (const row of rows) {
      await this.prisma.analyticsDailyAggregate.upsert({
        where: {
          day_metric_dimension: {
            day: row.day,
            metric: row.metric,
            dimension: "_",
          },
        },
        create: {
          day: row.day,
          metric: row.metric,
          dimension: "_",
          count: row.count,
          uniqueSessions: row.unique_sessions,
        },
        update: {
          count: row.count,
          uniqueSessions: row.unique_sessions,
        },
      });
    }

    if (rows.length > 0) {
      this.logger.log(`Rolled up ${rows.length} analytics daily aggregate row(s)`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredEvents(): Promise<void> {
    const days = Number.parseInt(process.env.ANALYTICS_RETENTION_DAYS ?? "90", 10);
    const retentionDays = Number.isFinite(days) && days > 0 ? days : 90;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);

    const result = await this.prisma.analyticsEvent.deleteMany({
      where: { occurredAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} analytics event(s) older than ${retentionDays} days`);
    }
  }
}
