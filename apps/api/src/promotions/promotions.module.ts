import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";

import { PromotionsAdminController } from "./promotions-admin.controller";
import { PromotionsService } from "./promotions.service";

@Module({
  imports: [AuditModule],
  controllers: [PromotionsAdminController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
