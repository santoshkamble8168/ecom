import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service";

/**
 * Sprint 11 — scheduled publish/unpublish: promotes `Page`/`BlogPost` rows
 * whose `scheduledAt` has arrived to `published`, and archives content whose
 * `endsAt`-equivalent window has passed (banners only, via `endsAt`).
 */
@Injectable()
export class CmsJobsService {
  private readonly logger = new Logger(CmsJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledContent(): Promise<void> {
    const now = new Date();

    const pages = await this.prisma.page.updateMany({
      where: { status: "scheduled", scheduledAt: { lte: now } },
      data: { status: "published", publishedAt: now },
    });
    const posts = await this.prisma.blogPost.updateMany({
      where: { status: "scheduled", scheduledAt: { lte: now } },
      data: { status: "published", publishedAt: now },
    });
    const banners = await this.prisma.banner.updateMany({
      where: { status: "scheduled", startsAt: { lte: now } },
      data: { status: "published" },
    });
    const expiredBanners = await this.prisma.banner.updateMany({
      where: { status: "published", endsAt: { lte: now } },
      data: { status: "archived" },
    });

    const total = pages.count + posts.count + banners.count + expiredBanners.count;
    if (total > 0) {
      this.logger.log(
        `Published pages=${pages.count} posts=${posts.count} banners=${banners.count}, archived expired banners=${expiredBanners.count}`,
      );
    }
  }
}
