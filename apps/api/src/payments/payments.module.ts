import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { InventoryModule } from "../inventory/inventory.module";
import { PromotionsModule } from "../promotions/promotions.module";

import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { RazorpayProvider } from "./razorpay.provider";

@Module({
  imports: [AuditModule, InventoryModule, PromotionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
