import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { AddTrackingEventDto } from "./dto/add-tracking-event.dto";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import { ResolveExchangeDto } from "./dto/resolve-exchange.dto";
import { ResolveReturnDto } from "./dto/resolve-return.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@ApiTags("admin-orders")
@Controller("admin")
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("orders")
  @Permissions(PERMISSIONS.ORDER_READ)
  list(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.adminList(query);
  }

  @Get("couriers")
  @Permissions(PERMISSIONS.ORDER_READ)
  listCouriers() {
    return this.ordersService.listCouriers();
  }

  @Get("orders/:id")
  @Permissions(PERMISSIONS.ORDER_READ)
  getById(@Param("id") id: string) {
    return this.ordersService.adminGetDetail(id);
  }

  @Patch("orders/:id/status")
  @Permissions(PERMISSIONS.ORDER_WRITE)
  updateStatus(
    @Param("id") id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.adminUpdateStatus(id, dto, admin.id);
  }

  @Post("orders/:id/shipments")
  @Permissions(PERMISSIONS.ORDER_WRITE)
  createShipment(
    @Param("id") id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.ordersService.adminCreateShipment(id, dto, admin.id);
  }

  @Post("shipments/:shipmentId/events")
  @Permissions(PERMISSIONS.ORDER_WRITE)
  addTrackingEvent(
    @Param("shipmentId") shipmentId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AddTrackingEventDto,
  ) {
    return this.ordersService.adminAddTrackingEvent(shipmentId, dto, admin.id);
  }

  @Patch("returns/:id")
  @Permissions(PERMISSIONS.ORDER_WRITE)
  resolveReturn(
    @Param("id") id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ResolveReturnDto,
  ) {
    return this.ordersService.adminResolveReturn(id, dto, admin.id);
  }

  @Patch("exchanges/:id")
  @Permissions(PERMISSIONS.ORDER_WRITE)
  resolveExchange(
    @Param("id") id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ResolveExchangeDto,
  ) {
    return this.ordersService.adminResolveExchange(id, dto, admin.id);
  }
}
