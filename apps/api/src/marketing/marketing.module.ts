import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";

import { MarketingAdminController } from "./marketing-admin.controller";
import { MarketingController } from "./marketing.controller";
import { MarketingService } from "./marketing.service";

@Module({
  imports: [AuditModule],
  controllers: [MarketingController, MarketingAdminController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
