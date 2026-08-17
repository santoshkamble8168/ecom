import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";

import { InventoryAdminController } from "./inventory-admin.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [AuditModule],
  controllers: [InventoryAdminController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
