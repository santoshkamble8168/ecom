import { Module } from "@nestjs/common";

import { PricingModule } from "../pricing/pricing.module";

import { StorefrontController } from "./storefront.controller";
import { StorefrontService } from "./storefront.service";

@Module({
  imports: [PricingModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
