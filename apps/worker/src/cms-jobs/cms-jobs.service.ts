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

    const duePages = await this.prisma.page.findMany({
      where: { status: "scheduled", scheduledAt: { lte: now }, deletedAt: null },
    });
    for (const page of duePages) {
      const updated = await this.prisma.page.update({
        where: { id: page.id },
        data: { status: "published", publishedAt: now, scheduledAt: null },
      });
      await this.prisma.pageVersion.create({
        data: {
          pageId: updated.id,
          title: updated.title,
          fields: updated.fields as object,
          seoSnapshot: {
            seoTitle: updated.seoTitle,
            seoDescription: updated.seoDescription,
            seoCanonicalUrl: updated.seoCanonicalUrl,
            seoOgImage: updated.seoOgImage,
            seoNoIndex: updated.seoNoIndex,
          },
          publishedBy: null,
        },
      });
    }
    const pages = { count: duePages.length };
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
