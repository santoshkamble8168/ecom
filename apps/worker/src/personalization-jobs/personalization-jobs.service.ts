import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service";

type Affinity = { slug: string; score: number };

/**
 * Sprint 16 — aggregate logged-in recently-viewed history into category and
 * product affinities. No email/phone/payment fields are stored. Disabled
 * when `personalization.profiles` is off. Runs in-process (table scan).
 */
@Injectable()
export class PersonalizationJobsService {
  private readonly logger = new Logger(PersonalizationJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateProfiles(): Promise<void> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: "personalization.profiles" },
    });
    if (flag && !flag.isEnabled) return;

    const views = await this.prisma.recentlyViewed.findMany({
      where: { userId: { not: null } },
      select: { userId: true, productSlug: true },
    });

    const byUser = new Map<string, string[]>();
    for (const row of views) {
      if (!row.userId) continue;
      const list = byUser.get(row.userId) ?? [];
      list.push(row.productSlug);
      byUser.set(row.userId, list);
    }

    const slugs = [...new Set(views.map((row) => row.productSlug))];
    const products = slugs.length
      ? await this.prisma.product.findMany({
          where: { slug: { in: slugs } },
          select: { slug: true, categories: { select: { category: { select: { slug: true } } } } },
        })
      : [];
    const categoryByProduct = new Map(
      products.map((product) => [
        product.slug,
        product.categories.map((row) => row.category.slug),
      ]),
    );

    let upserts = 0;
    for (const [userId, productSlugs] of byUser) {
      const productCounts = count(productSlugs);
      const categorySlugs = productSlugs.flatMap((slug) => categoryByProduct.get(slug) ?? []);
      const categoryCounts = count(categorySlugs);
      await this.prisma.personalizationProfile.upsert({
        where: { userId },
        create: {
          userId,
          productAffinities: toAffinities(productCounts),
          categoryAffinities: toAffinities(categoryCounts),
        },
        update: {
          productAffinities: toAffinities(productCounts),
          categoryAffinities: toAffinities(categoryCounts),
        },
      });
      upserts += 1;
    }

    if (upserts > 0) {
      this.logger.log(`Updated ${upserts} personalization profile(s)`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeStaleProfiles(): Promise<void> {
    const days = Number.parseInt(process.env.PERSONALIZATION_RETENTION_DAYS ?? "90", 10);
    const retentionDays = Number.isFinite(days) && days > 0 ? days : 90;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);

    const result = await this.prisma.personalizationProfile.deleteMany({
      where: { updatedAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} stale personalization profile(s)`);
    }
  }
}

function count(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}

function toAffinities(counts: Map<string, number>): Affinity[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([slug, score]) => ({ slug, score }));
}
