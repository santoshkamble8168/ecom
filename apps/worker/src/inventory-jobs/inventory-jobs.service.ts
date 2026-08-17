import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service";

/**
 * Sprint 10 — inventory background jobs: release expired stock reservations
 * back to sellable stock, and scan for low-stock items to alert on.
 */
@Injectable()
export class InventoryJobsService {
  private readonly logger = new Logger(InventoryJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredReservations(): Promise<void> {
    const expired = await this.prisma.stockReservation.findMany({
      where: { status: "active", expiresAt: { lt: new Date() } },
    });
    if (expired.length === 0) return;

    for (const reservation of expired) {
      await this.prisma.$transaction([
        this.prisma.stockReservation.update({
          where: { id: reservation.id },
          data: { status: "expired", releasedAt: new Date() },
        }),
        this.prisma.stockItem.updateMany({
          where: { warehouseId: reservation.warehouseId, variantSku: reservation.variantSku },
          data: { reserved: { decrement: reservation.quantity } },
        }),
        this.prisma.stockMovement.create({
          data: {
            warehouseId: reservation.warehouseId,
            variantSku: reservation.variantSku,
            type: "release",
            quantity: reservation.quantity,
            referenceType: "stock_reservation",
            referenceId: reservation.id,
            note: "Reservation expired",
            actorType: "system",
          },
        }),
      ]);
    }

    this.logger.log(`Released ${expired.length} expired stock reservation(s)`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scanLowStock(): Promise<void> {
    // Column-to-column comparison (onHand <= lowStockThreshold) isn't
    // expressible in a Prisma `where` filter, so this uses a raw query.
    const lowStock = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM stock_items WHERE on_hand <= low_stock_threshold
    `;
    if (lowStock.length > 0) {
      this.logger.warn(`${lowStock.length} stock item(s) at or below their low-stock threshold`);
    }
  }
}
