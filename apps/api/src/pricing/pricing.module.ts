import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";

import { PricingAdminController } from "./pricing-admin.controller";
import { PricingService } from "./pricing.service";

@Module({
  imports: [AuditModule],
  controllers: [PricingAdminController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
