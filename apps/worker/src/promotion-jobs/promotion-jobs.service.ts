import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service";

/** Sprint 10 — flips `Campaign.status` between scheduled/active/ended based on `startsAt`/`endsAt`. */
@Injectable()
export class PromotionJobsService {
  private readonly logger = new Logger(PromotionJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async activateAndExpireCampaigns(): Promise<void> {
    const now = new Date();

    const activated = await this.prisma.campaign.updateMany({
      where: { status: "scheduled", startsAt: { lte: now }, endsAt: { gt: now } },
      data: { status: "active" },
    });
    const ended = await this.prisma.campaign.updateMany({
      where: { status: { in: ["scheduled", "active"] }, endsAt: { lte: now } },
      data: { status: "ended" },
    });

    if (activated.count > 0 || ended.count > 0) {
      this.logger.log(`Campaigns activated=${activated.count} ended=${ended.count}`);
    }
  }
}
