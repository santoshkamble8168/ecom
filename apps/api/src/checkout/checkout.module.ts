import { Module } from "@nestjs/common";

import { AnalyticsModule } from "../analytics/analytics.module";
import { AuditModule } from "../audit/audit.module";
import { CartModule } from "../cart/cart.module";
import { InventoryModule } from "../inventory/inventory.module";
import { PromotionsModule } from "../promotions/promotions.module";

import { AdminShippingController } from "./admin-shipping.controller";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [CartModule, AuditModule, InventoryModule, PromotionsModule, AnalyticsModule],
  controllers: [CheckoutController, AdminShippingController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
