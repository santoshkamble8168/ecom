import { Module } from "@nestjs/common";

import { PricingModule } from "../pricing/pricing.module";
import { PromotionsModule } from "../promotions/promotions.module";

import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [PricingModule, PromotionsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
