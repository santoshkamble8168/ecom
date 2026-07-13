import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { CartModule } from "../cart/cart.module";

import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [CartModule, AuditModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
