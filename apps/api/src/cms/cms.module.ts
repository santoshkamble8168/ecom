import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";

import { CmsAdminController } from "./cms-admin.controller";
import { CmsController } from "./cms.controller";
import { CmsService } from "./cms.service";

@Module({
  imports: [AuditModule],
  controllers: [CmsController, CmsAdminController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
