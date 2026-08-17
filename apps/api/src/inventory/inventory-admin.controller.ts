import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { ListPurchaseOrdersQueryDto } from "./dto/list-purchase-orders-query.dto";
import { ListStockMovementsQueryDto } from "./dto/list-stock-movements-query.dto";
import { ListStockQueryDto } from "./dto/list-stock-query.dto";
import { ReceivePurchaseOrderDto } from "./dto/receive-purchase-order.dto";
import { StockAdjustmentDto } from "./dto/stock-adjustment.dto";
import { StockTransferDto } from "./dto/stock-transfer.dto";
import { UpdatePurchaseOrderStatusDto } from "./dto/update-purchase-order-status.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { InventoryService } from "./inventory.service";

@ApiTags("admin-inventory")
@Controller("admin")
export class InventoryAdminController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("warehouses")
  @Permissions(PERMISSIONS.INVENTORY_READ)
  listWarehouses() {
    return this.inventoryService.listWarehouses();
  }

  @Post("warehouses")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  createWarehouse(@Body() dto: CreateWarehouseDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.inventoryService.createWarehouse(dto, admin.id);
  }

  @Patch("warehouses/:id")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  updateWarehouse(
    @Param("id") id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.inventoryService.updateWarehouse(id, dto, admin.id);
  }

  @Get("stock")
  @Permissions(PERMISSIONS.INVENTORY_READ)
  listStock(@Query() query: ListStockQueryDto) {
    return this.inventoryService.listStock(query);
  }

  @Post("stock/adjust")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  adjustStock(@Body() dto: StockAdjustmentDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.inventoryService.adjustStock(dto, admin.id);
  }

  @Post("stock/transfer")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  transferStock(@Body() dto: StockTransferDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.inventoryService.transferStock(dto, admin.id);
  }

  @Get("stock/movements")
  @Permissions(PERMISSIONS.INVENTORY_READ)
  listMovements(@Query() query: ListStockMovementsQueryDto) {
    return this.inventoryService.listMovements(query);
  }

  @Get("stock/low-stock")
  @Permissions(PERMISSIONS.INVENTORY_READ)
  lowStock() {
    return this.inventoryService.lowStockAlerts();
  }

  @Get("suppliers")
  @Permissions(PERMISSIONS.INVENTORY_READ)
  listSuppliers() {
    return this.inventoryService.listSuppliers();
  }

  @Post("suppliers")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.inventoryService.createSupplier(dto, admin.id);
  }

  @Get("purchase-orders")
  @Permissions(PERMISSIONS.INVENTORY_READ)
  listPurchaseOrders(@Query() query: ListPurchaseOrdersQueryDto) {
    return this.inventoryService.listPurchaseOrders(query);
  }

  @Post("purchase-orders")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.inventoryService.createPurchaseOrder(dto, admin.id);
  }

  @Get("purchase-orders/:id")
  @Permissions(PERMISSIONS.INVENTORY_READ)
  getPurchaseOrder(@Param("id") id: string) {
    return this.inventoryService.getPurchaseOrder(id);
  }

  @Patch("purchase-orders/:id/status")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  updatePurchaseOrderStatus(
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.inventoryService.updatePurchaseOrderStatus(id, dto.status, admin.id);
  }

  @Post("purchase-orders/:id/receive")
  @Permissions(PERMISSIONS.INVENTORY_WRITE)
  receivePurchaseOrder(
    @Param("id") id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.inventoryService.receivePurchaseOrderItems(id, dto.items, admin.id);
  }
}
