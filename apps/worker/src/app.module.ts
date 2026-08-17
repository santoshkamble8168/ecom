import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { InventoryJobsModule } from "./inventory-jobs/inventory-jobs.module";
import { PricingJobsModule } from "./pricing-jobs/pricing-jobs.module";
import { PromotionJobsModule } from "./promotion-jobs/promotion-jobs.module";
import { CmsJobsModule } from "./cms-jobs/cms-jobs.module";
import { AdminJobsModule } from "./admin-jobs/admin-jobs.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Cron-scheduled jobs (stock reservation release, scheduled pricing,
    // campaign activation, low-stock alerts, CMS scheduled publish/unpublish)
    // run in-process via @nestjs/schedule rather than as BullMQ jobs — they
    // are periodic table scans, not event-triggered work, so a queue isn't
    // needed. See docs/runbooks/scheduled-jobs-runbook.md.
    ScheduleModule.forRoot(),
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "127.0.0.1",
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    NotificationsModule,
    InventoryJobsModule,
    PricingJobsModule,
    PromotionJobsModule,
    CmsJobsModule,
    AdminJobsModule,
  ],
})
export class AppModule {}
