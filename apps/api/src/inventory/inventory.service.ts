import type {
  LowStockAlert,
  PurchaseOrderStatus,
  PurchaseOrderSummary,
  StockAdjustmentInput,
  StockItemSummary,
  StockMovementSummary,
  StockTransferInput,
  SupplierSummary,
  WarehouseSummary,
} from "@ecom/types";
import { NotFoundError, ValidationError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  PurchaseOrder as PurchaseOrderModel,
  PurchaseOrderItem as PurchaseOrderItemModel,
  StockItem as StockItemModel,
  StockMovement as StockMovementModel,
  Supplier as SupplierModel,
  Warehouse as WarehouseModel,
} from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import type { CreateSupplierDto } from "./dto/create-supplier.dto";
import type { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import type { ListPurchaseOrdersQueryDto } from "./dto/list-purchase-orders-query.dto";
import type { ListStockMovementsQueryDto } from "./dto/list-stock-movements-query.dto";
import type { ListStockQueryDto } from "./dto/list-stock-query.dto";
import type { ReceivePurchaseOrderItemDto } from "./dto/receive-purchase-order-item.dto";
import type { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import {
  assertPurchaseOrderTransition,
  generatePoNumber,
  nextPurchaseOrderStatusAfterReceipt,
} from "./policies/purchase-order.policy";

export interface PaginatedStockItems {
  stockItems: StockItemSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedStockMovements {
  movements: StockMovementSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedPurchaseOrders {
  purchaseOrders: PurchaseOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockTransferResult {
  from: StockItemSummary;
  to: StockItemSummary;
}

type PurchaseOrderWithRelations = PurchaseOrderModel & {
  supplier: SupplierModel;
  warehouse: WarehouseModel;
  items: PurchaseOrderItemModel[];
};

type StockItemWithWarehouse = StockItemModel & { warehouse: WarehouseModel };

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------
  // Warehouses
  // ---------------------------------------------------------------------

  async listWarehouses(): Promise<WarehouseSummary[]> {
    const warehouses = await this.prisma.warehouse.findMany({
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    });
    return warehouses.map((w) => this.toWarehouseSummary(w));
  }

  async createWarehouse(dto: CreateWarehouseDto, adminId: string): Promise<WarehouseSummary> {
    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.warehouse.create({
        data: {
          code: dto.code,
          name: dto.name,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country ?? "IN",
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
        },
      });
    });

    await this.audit.log({
      userId: adminId,
      action: "WarehouseCreated",
      entityType: "warehouse",
      entityId: created.id,
      metadata: { code: created.code },
    });

    return this.toWarehouseSummary(created);
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto, adminId: string): Promise<WarehouseSummary> {
    const existing = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Warehouse not found");

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.warehouse.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
      }
      return tx.warehouse.update({
        where: { id },
        data: {
          name: dto.name,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          isDefault: dto.isDefault,
          isActive: dto.isActive,
        },
      });
    });

    await this.audit.log({
      userId: adminId,
      action: "WarehouseUpdated",
      entityType: "warehouse",
      entityId: id,
      metadata: { ...dto },
    });

    return this.toWarehouseSummary(updated);
  }

  // ---------------------------------------------------------------------
  // Stock
  // ---------------------------------------------------------------------

  async listStock(query: ListStockQueryDto): Promise<PaginatedStockItems> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;

    // `onHand <= lowStockThreshold` is a column-to-column comparison and
    // isn't expressible in a plain Prisma `where`, so filtering always goes
    // through a small raw-SQL id lookup (a no-op filter when lowStockOnly
    // isn't requested) and the full rows are then loaded back via Prisma.
    const conditions: Prisma.Sql[] = [];
    if (query.warehouseId) conditions.push(Prisma.sql`warehouse_id = ${query.warehouseId}`);
    if (query.variantSku) conditions.push(Prisma.sql`variant_sku = ${query.variantSku}`);
    if (query.lowStockOnly) conditions.push(Prisma.sql`on_hand <= low_stock_threshold`);
    const whereSql = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

    const [totalRows, idRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM stock_items ${whereSql}`,
      ),
      this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM stock_items ${whereSql} ORDER BY updated_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      ),
    ]);

    const ids = idRows.map((row) => row.id);
    const items =
      ids.length > 0
        ? await this.prisma.stockItem.findMany({ where: { id: { in: ids } }, include: { warehouse: true } })
        : [];
    const orderIndex = new Map(ids.map((id, index) => [id, index]));
    items.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

    const titles = await this.fetchProductTitles(items.map((i) => i.variantSku));

    return {
      stockItems: items.map((item) => this.toStockItemSummary(item, titles.get(item.variantSku) ?? null)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async adjustStock(dto: StockAdjustmentInput, adminId: string): Promise<StockItemSummary> {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse not found");

    const updated = await this.prisma.$transaction(async (tx) => {
      const stockItem = await tx.stockItem.upsert({
        where: { warehouseId_variantSku: { warehouseId: dto.warehouseId, variantSku: dto.variantSku } },
        update: {},
        create: { warehouseId: dto.warehouseId, variantSku: dto.variantSku },
      });

      const newOnHand = stockItem.onHand + dto.delta;
      if (newOnHand < 0) {
        throw new ValidationError("Adjustment would result in negative stock on hand");
      }

      const result = await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { onHand: newOnHand },
        include: { warehouse: true },
      });

      await tx.stockMovement.create({
        data: {
          warehouseId: dto.warehouseId,
          variantSku: dto.variantSku,
          type: dto.delta > 0 ? "adjustment_in" : "adjustment_out",
          quantity: Math.abs(dto.delta),
          note: dto.note,
          actorType: "admin",
          actorId: adminId,
        },
      });

      return result;
    });

    await this.audit.log({
      userId: adminId,
      action: "StockAdjusted",
      entityType: "stock_item",
      entityId: updated.id,
      metadata: { warehouseId: dto.warehouseId, variantSku: dto.variantSku, delta: dto.delta, note: dto.note },
    });

    const titles = await this.fetchProductTitles([dto.variantSku]);
    return this.toStockItemSummary(updated, titles.get(dto.variantSku) ?? null);
  }

  async transferStock(dto: StockTransferInput, adminId: string): Promise<StockTransferResult> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new ValidationError("Source and destination warehouses must differ");
    }

    const [fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.toWarehouseId } }),
    ]);
    if (!fromWarehouse) throw new NotFoundError("Source warehouse not found");
    if (!toWarehouse) throw new NotFoundError("Destination warehouse not found");

    const transferRef = `transfer-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    const [fromItem, toItem] = await this.prisma.$transaction(async (tx) => {
      const sourceItem = await tx.stockItem.findUnique({
        where: { warehouseId_variantSku: { warehouseId: dto.fromWarehouseId, variantSku: dto.variantSku } },
      });
      const available = (sourceItem?.onHand ?? 0) - (sourceItem?.reserved ?? 0);
      if (!sourceItem || available < dto.quantity) {
        throw new ValidationError("Insufficient available stock at the source warehouse");
      }

      const updatedSource = await tx.stockItem.update({
        where: { id: sourceItem.id },
        data: { onHand: { decrement: dto.quantity } },
        include: { warehouse: true },
      });

      const destItem = await tx.stockItem.upsert({
        where: { warehouseId_variantSku: { warehouseId: dto.toWarehouseId, variantSku: dto.variantSku } },
        update: { onHand: { increment: dto.quantity } },
        create: { warehouseId: dto.toWarehouseId, variantSku: dto.variantSku, onHand: dto.quantity },
        include: { warehouse: true },
      });

      await tx.stockMovement.createMany({
        data: [
          {
            warehouseId: dto.fromWarehouseId,
            variantSku: dto.variantSku,
            type: "transfer_out",
            quantity: dto.quantity,
            note: dto.note,
            referenceType: "stock_transfer",
            referenceId: transferRef,
            actorType: "admin",
            actorId: adminId,
          },
          {
            warehouseId: dto.toWarehouseId,
            variantSku: dto.variantSku,
            type: "transfer_in",
            quantity: dto.quantity,
            note: dto.note,
            referenceType: "stock_transfer",
            referenceId: transferRef,
            actorType: "admin",
            actorId: adminId,
          },
        ],
      });

      return [updatedSource, destItem];
    });

    await this.audit.log({
      userId: adminId,
      action: "StockTransferred",
      entityType: "stock_item",
      entityId: fromItem.id,
      metadata: {
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        variantSku: dto.variantSku,
        quantity: dto.quantity,
      },
    });

    const titles = await this.fetchProductTitles([dto.variantSku]);
    const title = titles.get(dto.variantSku) ?? null;
    return {
      from: this.toStockItemSummary(fromItem, title),
      to: this.toStockItemSummary(toItem, title),
    };
  }

  async listMovements(query: ListStockMovementsQueryDto): Promise<PaginatedStockMovements> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.StockMovementWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.variantSku ? { variantSku: query.variantSku } : {}),
    };

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      movements: movements.map((m) => this.toMovementSummary(m)),
      total,
      page,
      pageSize,
    };
  }

  async lowStockAlerts(): Promise<LowStockAlert[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        warehouseId: string;
        warehouseName: string;
        variantSku: string;
        productTitle: string | null;
        onHand: number;
        reserved: number;
        lowStockThreshold: number;
      }>
    >`
      SELECT
        si.warehouse_id AS "warehouseId",
        w.name AS "warehouseName",
        si.variant_sku AS "variantSku",
        p.title AS "productTitle",
        si.on_hand AS "onHand",
        si.reserved AS "reserved",
        si.low_stock_threshold AS "lowStockThreshold"
      FROM stock_items si
      JOIN warehouses w ON w.id = si.warehouse_id
      LEFT JOIN product_variants pv ON pv.sku = si.variant_sku
      LEFT JOIN products p ON p.id = pv.product_id
      WHERE si.on_hand <= si.low_stock_threshold
      ORDER BY si.on_hand ASC
    `;

    return rows.map((row) => ({
      warehouseId: row.warehouseId,
      warehouseName: row.warehouseName,
      variantSku: row.variantSku,
      productTitle: row.productTitle,
      onHand: row.onHand,
      reserved: row.reserved,
      available: row.onHand - row.reserved,
      lowStockThreshold: row.lowStockThreshold,
    }));
  }

  // ---------------------------------------------------------------------
  // Suppliers
  // ---------------------------------------------------------------------

  async listSuppliers(): Promise<SupplierSummary[]> {
    const suppliers = await this.prisma.supplier.findMany({ orderBy: { name: "asc" } });
    return suppliers.map((s) => this.toSupplierSummary(s));
  }

  async createSupplier(dto: CreateSupplierDto, adminId: string): Promise<SupplierSummary> {
    const created = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "SupplierCreated",
      entityType: "supplier",
      entityId: created.id,
      metadata: { name: created.name },
    });

    return this.toSupplierSummary(created);
  }

  // ---------------------------------------------------------------------
  // Purchase orders
  // ---------------------------------------------------------------------

  async listPurchaseOrders(query: ListPurchaseOrdersQueryDto): Promise<PaginatedPurchaseOrders> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { supplier: true, warehouse: true, items: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      purchaseOrders: orders.map((o) => this.toPurchaseOrderSummary(o)),
      total,
      page,
      pageSize,
    };
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrderSummary> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, warehouse: true, items: true },
    });
    if (!po) throw new NotFoundError("Purchase order not found");
    return this.toPurchaseOrderSummary(po);
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, adminId: string): Promise<PurchaseOrderSummary> {
    const [supplier, warehouse] = await Promise.all([
      this.prisma.supplier.findUnique({ where: { id: dto.supplierId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
    ]);
    if (!supplier) throw new NotFoundError("Supplier not found");
    if (!warehouse) throw new NotFoundError("Warehouse not found");

    const created = await this.prisma.purchaseOrder.create({
      data: {
        poNumber: generatePoNumber(),
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        status: "draft",
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
        note: dto.note,
        items: {
          create: dto.items.map((item) => ({
            variantSku: item.variantSku,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
          })),
        },
      },
      include: { supplier: true, warehouse: true, items: true },
    });

    await this.audit.log({
      userId: adminId,
      action: "PurchaseOrderCreated",
      entityType: "purchase_order",
      entityId: created.id,
      metadata: { poNumber: created.poNumber, supplierId: dto.supplierId, warehouseId: dto.warehouseId },
    });

    return this.toPurchaseOrderSummary(created);
  }

  async updatePurchaseOrderStatus(
    id: string,
    status: PurchaseOrderStatus,
    adminId: string,
  ): Promise<PurchaseOrderSummary> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundError("Purchase order not found");

    assertPurchaseOrderTransition(po.status, status);

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { supplier: true, warehouse: true, items: true },
    });

    await this.audit.log({
      userId: adminId,
      action: "PurchaseOrderStatusUpdated",
      entityType: "purchase_order",
      entityId: id,
      metadata: { from: po.status, to: status },
    });

    return this.toPurchaseOrderSummary(updated);
  }

  async receivePurchaseOrderItems(
    id: string,
    items: ReceivePurchaseOrderItemDto[],
    adminId: string,
  ): Promise<PurchaseOrderSummary> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) throw new NotFoundError("Purchase order not found");
    if (po.status === "received" || po.status === "cancelled") {
      throw new ValidationError(`Cannot receive items for a purchase order in "${po.status}" status`);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const receipt of items) {
        const poItem = po.items.find((i) => i.variantSku === receipt.variantSku);
        if (!poItem) throw new ValidationError(`SKU ${receipt.variantSku} is not part of this purchase order`);

        const newReceived = poItem.quantityReceived + receipt.quantityReceived;
        if (newReceived > poItem.quantityOrdered) {
          throw new ValidationError(`Received quantity for ${receipt.variantSku} exceeds the quantity ordered`);
        }

        await tx.purchaseOrderItem.update({ where: { id: poItem.id }, data: { quantityReceived: newReceived } });

        await tx.stockItem.upsert({
          where: { warehouseId_variantSku: { warehouseId: po.warehouseId, variantSku: receipt.variantSku } },
          update: { onHand: { increment: receipt.quantityReceived } },
          create: {
            warehouseId: po.warehouseId,
            variantSku: receipt.variantSku,
            onHand: receipt.quantityReceived,
          },
        });

        await tx.stockMovement.create({
          data: {
            warehouseId: po.warehouseId,
            variantSku: receipt.variantSku,
            type: "purchase_in",
            quantity: receipt.quantityReceived,
            referenceType: "purchase_order",
            referenceId: po.id,
            actorType: "admin",
            actorId: adminId,
          },
        });
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
      const nextStatus = nextPurchaseOrderStatusAfterReceipt(
        refreshedItems.map((i) => ({ quantityOrdered: i.quantityOrdered, quantityReceived: i.quantityReceived })),
      );
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: nextStatus } });
    });

    await this.audit.log({
      userId: adminId,
      action: "PurchaseOrderReceived",
      entityType: "purchase_order",
      entityId: id,
      metadata: { items: items as unknown as Prisma.InputJsonValue },
    });

    const updated = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { supplier: true, warehouse: true, items: true },
    });
    return this.toPurchaseOrderSummary(updated);
  }

  // ---------------------------------------------------------------------
  // Public integration points (reservations) — consumed by cart/checkout in
  // a later sprint; not wired up to any route yet.
  // ---------------------------------------------------------------------

  async reserveStock(params: {
    warehouseId?: string;
    variantSku: string;
    quantity: number;
    cartId?: string;
    checkoutId?: string;
    ttlMinutes: number;
  }): Promise<{ reservationId: string }> {
    if (params.quantity <= 0) throw new ValidationError("Reservation quantity must be positive");

    let warehouseId = params.warehouseId;
    if (!warehouseId) {
      const defaultWarehouse = await this.prisma.warehouse.findFirst({ where: { isDefault: true } });
      if (!defaultWarehouse) throw new NotFoundError("No default warehouse is configured");
      warehouseId = defaultWarehouse.id;
    }

    const reservation = await this.prisma.$transaction(async (tx) => {
      const stockItem = await tx.stockItem.findUnique({
        where: { warehouseId_variantSku: { warehouseId, variantSku: params.variantSku } },
      });
      const available = (stockItem?.onHand ?? 0) - (stockItem?.reserved ?? 0);
      if (!stockItem || available < params.quantity) {
        throw new ValidationError(`Insufficient available stock for ${params.variantSku}`);
      }

      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { reserved: { increment: params.quantity } },
      });

      const created = await tx.stockReservation.create({
        data: {
          warehouseId,
          variantSku: params.variantSku,
          quantity: params.quantity,
          cartId: params.cartId,
          checkoutId: params.checkoutId,
          status: "active",
          expiresAt: new Date(Date.now() + params.ttlMinutes * 60_000),
        },
      });

      await tx.stockMovement.create({
        data: {
          warehouseId,
          variantSku: params.variantSku,
          type: "reservation",
          quantity: params.quantity,
          referenceType: "stock_reservation",
          referenceId: created.id,
          actorType: "system",
        },
      });

      return created;
    });

    return { reservationId: reservation.id };
  }

  async consumeReservation(reservationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findUnique({ where: { id: reservationId } });
      if (!reservation) throw new NotFoundError("Stock reservation not found");
      if (reservation.status !== "active") {
        throw new ValidationError(`Reservation is not active (status: ${reservation.status})`);
      }

      await tx.stockItem.updateMany({
        where: { warehouseId: reservation.warehouseId, variantSku: reservation.variantSku },
        data: { onHand: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity } },
      });

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: "consumed" },
      });

      await tx.stockMovement.create({
        data: {
          warehouseId: reservation.warehouseId,
          variantSku: reservation.variantSku,
          type: "sale_out",
          quantity: reservation.quantity,
          referenceType: "stock_reservation",
          referenceId: reservation.id,
          actorType: "system",
        },
      });
    });
  }

  /**
   * Releases a still-active reservation back to sellable stock without a
   * sale (checkout abandoned/cancelled, or a multi-item reservation attempt
   * partially failed and earlier reservations need to be rolled back).
   * Idempotent no-op if the reservation is already terminal.
   */
  async releaseReservation(reservationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findUnique({ where: { id: reservationId } });
      if (!reservation || reservation.status !== "active") return;

      await tx.stockItem.updateMany({
        where: { warehouseId: reservation.warehouseId, variantSku: reservation.variantSku },
        data: { reserved: { decrement: reservation.quantity } },
      });

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: "released", releasedAt: new Date() },
      });

      await tx.stockMovement.create({
        data: {
          warehouseId: reservation.warehouseId,
          variantSku: reservation.variantSku,
          type: "release",
          quantity: reservation.quantity,
          referenceType: "stock_reservation",
          referenceId: reservation.id,
          actorType: "system",
        },
      });
    });
  }

  /** Releases every still-active reservation tied to a checkout session (best-effort). */
  async releaseReservationsForCheckout(checkoutId: string): Promise<void> {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { checkoutId, status: "active" },
    });
    for (const reservation of reservations) {
      await this.releaseReservation(reservation.id);
    }
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async fetchProductTitles(skus: string[]): Promise<Map<string, string | null>> {
    if (skus.length === 0) return new Map();
    const variants = await this.prisma.productVariant.findMany({
      where: { sku: { in: [...new Set(skus)] } },
      select: { sku: true, product: { select: { title: true } } },
    });
    return new Map(variants.map((v) => [v.sku, v.product?.title ?? null]));
  }

  private toWarehouseSummary(warehouse: WarehouseModel): WarehouseSummary {
    return {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      line1: warehouse.line1,
      line2: warehouse.line2,
      city: warehouse.city,
      state: warehouse.state,
      postalCode: warehouse.postalCode,
      country: warehouse.country,
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive,
      createdAt: warehouse.createdAt.toISOString(),
    };
  }

  private toStockItemSummary(item: StockItemWithWarehouse, productTitle: string | null): StockItemSummary {
    return {
      id: item.id,
      warehouseId: item.warehouseId,
      warehouseCode: item.warehouse.code,
      variantSku: item.variantSku,
      productTitle,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.onHand - item.reserved,
      safetyStock: item.safetyStock,
      lowStockThreshold: item.lowStockThreshold,
      isLowStock: item.onHand <= item.lowStockThreshold,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toMovementSummary(movement: StockMovementModel): StockMovementSummary {
    return {
      id: movement.id,
      warehouseId: movement.warehouseId,
      variantSku: movement.variantSku,
      type: movement.type,
      quantity: movement.quantity,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      note: movement.note,
      actorType: movement.actorType,
      actorId: movement.actorId,
      createdAt: movement.createdAt.toISOString(),
    };
  }

  private toSupplierSummary(supplier: SupplierModel): SupplierSummary {
    return {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt.toISOString(),
    };
  }

  private toPurchaseOrderSummary(po: PurchaseOrderWithRelations): PurchaseOrderSummary {
    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      warehouseId: po.warehouseId,
      warehouseName: po.warehouse.name,
      status: po.status,
      expectedAt: po.expectedAt?.toISOString() ?? null,
      note: po.note,
      items: po.items.map((item) => ({
        id: item.id,
        variantSku: item.variantSku,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityReceived,
        unitCost: item.unitCost.toString(),
      })),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    };
  }
}
