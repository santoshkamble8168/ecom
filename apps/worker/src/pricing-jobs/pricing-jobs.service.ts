import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service";

/**
 * Sprint 10 — scheduled pricing activation: flips a `ProductPrice` row's
 * effective sale in/out of the "active" window and clears expired sale
 * windows so storefront reads don't need to re-check dates on every request.
 */
@Injectable()
export class PricingJobsService {
  private readonly logger = new Logger(PricingJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireEndedSales(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.productPrice.updateMany({
      where: { saleEndsAt: { lt: now }, salePrice: { not: null } },
      data: { salePrice: null, saleStartsAt: null, saleEndsAt: null },
    });
    if (result.count > 0) {
      this.logger.log(`Cleared ${result.count} expired sale price window(s)`);
    }
  }
}
