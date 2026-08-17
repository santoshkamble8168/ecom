import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { CancelOrderDto } from "./dto/cancel-order.dto";
import { RequestExchangeDto } from "./dto/request-exchange.dto";
import { RequestReturnDto } from "./dto/request-return.dto";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@SkipThrottle()
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // NOTE: `GET /orders/:orderNumber` (public order confirmation) lives in
  // PaymentsController. Routes below are nested under extra static segments
  // so they can never collide with that single-dynamic-segment route,
  // regardless of module registration order.

  @Get("orders")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listForUser(user.id);
  }

  @Get("orders/meta/return-reasons")
  listReturnReasons() {
    return this.ordersService.listReturnReasons();
  }

  @Get("orders/meta/exchange-reasons")
  listExchangeReasons() {
    return this.ordersService.listExchangeReasons();
  }

  @Public()
  @Get("tracking/:shipmentNumber")
  track(@Param("shipmentNumber") shipmentNumber: string) {
    return this.ordersService.trackByShipmentNumber(shipmentNumber);
  }

  @Get("orders/:id/detail")
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.getDetailForUser(id, user.id);
  }

  @Post("orders/:id/cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancel(id, user.id, dto.reason);
  }

  @Post("orders/:id/return")
  requestReturn(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: RequestReturnDto) {
    return this.ordersService.requestReturn(id, user.id, dto);
  }

  @Post("orders/:id/exchange")
  requestExchange(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: RequestExchangeDto) {
    return this.ordersService.requestExchange(id, user.id, dto);
  }

  @Get("orders/:id/invoice")
  getInvoice(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.getInvoice(id, user.id);
  }

  @Get("orders/:id/invoice/view")
  async viewInvoice(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const html = await this.ordersService.getInvoiceHtml(id, user.id);
    res.type("html").send(html);
  }
}
