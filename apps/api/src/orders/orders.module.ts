import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";

import { OrdersAdminController } from "./orders-admin.controller";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [AuditModule],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
