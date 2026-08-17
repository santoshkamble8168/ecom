import { NotFoundError, ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { InventoryService } from "./inventory.service";

function baseWarehouse(overrides: Record<string, unknown> = {}) {
  return {
    id: "wh-1",
    code: "MUM1",
    name: "Mumbai Fulfillment Center",
    isDefault: true,
    ...overrides,
  };
}

function baseStockItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "stock-1",
    warehouseId: "wh-1",
    variantSku: "CCN-BLK-M",
    onHand: 20,
    reserved: 5,
    safetyStock: 0,
    lowStockThreshold: 5,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    warehouse: baseWarehouse(),
    ...overrides,
  };
}

describe("InventoryService", () => {
  let service: InventoryService;
  let prisma: {
    warehouse: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    stockItem: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    stockMovement: { create: jest.Mock; createMany: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    stockReservation: { create: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    supplier: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    purchaseOrder: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    purchaseOrderItem: { update: jest.Mock; findMany: jest.Mock };
    productVariant: { findMany: jest.Mock };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      warehouse: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      stockItem: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      stockReservation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      supplier: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      purchaseOrder: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      purchaseOrderItem: { update: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
      productVariant: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new InventoryService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  describe("adjustStock", () => {
    it("rejects an adjustment that would push on-hand negative", async () => {
      prisma.warehouse.findUnique.mockResolvedValue(baseWarehouse());
      prisma.stockItem.upsert.mockResolvedValue(baseStockItem({ onHand: 5 }));

      await expect(
        service.adjustStock({ warehouseId: "wh-1", variantSku: "CCN-BLK-M", delta: -10 }, "admin-1"),
      ).rejects.toThrow(ValidationError);

      expect(prisma.stockItem.update).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it("increases on-hand and writes an adjustment_in movement", async () => {
      prisma.warehouse.findUnique.mockResolvedValue(baseWarehouse());
      prisma.stockItem.upsert.mockResolvedValue(baseStockItem({ onHand: 20 }));
      prisma.stockItem.update.mockResolvedValue(baseStockItem({ onHand: 30 }));

      const result = await service.adjustStock(
        { warehouseId: "wh-1", variantSku: "CCN-BLK-M", delta: 10, note: "Cycle count" },
        "admin-1",
      );

      expect(prisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { onHand: 30 } }),
      );
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "adjustment_in", quantity: 10 }) }),
      );
      expect(audit.log).toHaveBeenCalled();
      expect(result.onHand).toBe(30);
    });

    it("throws NotFoundError for an unknown warehouse", async () => {
      prisma.warehouse.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustStock({ warehouseId: "missing", variantSku: "CCN-BLK-M", delta: 5 }, "admin-1"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("transferStock", () => {
    it("rejects a transfer when the source lacks enough available stock", async () => {
      prisma.warehouse.findUnique.mockResolvedValueOnce(baseWarehouse({ id: "wh-1" })).mockResolvedValueOnce(
        baseWarehouse({ id: "wh-2", code: "DEL1" }),
      );
      prisma.stockItem.findUnique.mockResolvedValue(baseStockItem({ onHand: 10, reserved: 8 }));

      await expect(
        service.transferStock(
          { fromWarehouseId: "wh-1", toWarehouseId: "wh-2", variantSku: "CCN-BLK-M", quantity: 5 },
          "admin-1",
        ),
      ).rejects.toThrow(ValidationError);

      expect(prisma.stockItem.update).not.toHaveBeenCalled();
      expect(prisma.stockMovement.createMany).not.toHaveBeenCalled();
    });

    it("moves stock atomically and writes transfer_out/transfer_in movements", async () => {
      prisma.warehouse.findUnique.mockResolvedValueOnce(baseWarehouse({ id: "wh-1" })).mockResolvedValueOnce(
        baseWarehouse({ id: "wh-2", code: "DEL1" }),
      );
      prisma.stockItem.findUnique.mockResolvedValue(baseStockItem({ onHand: 30, reserved: 5 }));
      prisma.stockItem.update.mockResolvedValue(
        baseStockItem({ id: "stock-1", warehouseId: "wh-1", onHand: 25, warehouse: baseWarehouse({ id: "wh-1" }) }),
      );
      prisma.stockItem.upsert.mockResolvedValue(
        baseStockItem({
          id: "stock-2",
          warehouseId: "wh-2",
          onHand: 5,
          reserved: 0,
          warehouse: baseWarehouse({ id: "wh-2", code: "DEL1" }),
        }),
      );

      const result = await service.transferStock(
        { fromWarehouseId: "wh-1", toWarehouseId: "wh-2", variantSku: "CCN-BLK-M", quantity: 5 },
        "admin-1",
      );

      expect(prisma.stockMovement.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ type: "transfer_out", warehouseId: "wh-1", quantity: 5 }),
            expect.objectContaining({ type: "transfer_in", warehouseId: "wh-2", quantity: 5 }),
          ],
        }),
      );
      expect(result.from.warehouseId).toBe("wh-1");
      expect(result.to.warehouseId).toBe("wh-2");
    });
  });

  describe("receivePurchaseOrderItems", () => {
    function basePo(overrides: Record<string, unknown> = {}) {
      return {
        id: "po-1",
        warehouseId: "wh-1",
        status: "ordered",
        items: [
          { id: "poi-1", variantSku: "CCN-BLK-M", quantityOrdered: 10, quantityReceived: 0 },
          { id: "poi-2", variantSku: "CCN-BLK-L", quantityOrdered: 5, quantityReceived: 0 },
        ],
        ...overrides,
      };
    }

    it("increments onHand and marks the PO partially_received when some items are short", async () => {
      const po = basePo();
      prisma.purchaseOrder.findUnique.mockResolvedValue(po);
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { variantSku: "CCN-BLK-M", quantityOrdered: 10, quantityReceived: 10 },
        { variantSku: "CCN-BLK-L", quantityOrdered: 5, quantityReceived: 0 },
      ]);
      prisma.purchaseOrder.findUniqueOrThrow.mockResolvedValue({
        id: "po-1",
        poNumber: "PO2608000001",
        supplierId: "sup-1",
        warehouseId: "wh-1",
        status: "partially_received",
        expectedAt: null,
        note: null,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        supplier: { id: "sup-1", name: "Fabrico" },
        warehouse: baseWarehouse(),
      });

      await service.receivePurchaseOrderItems(
        "po-1",
        [{ variantSku: "CCN-BLK-M", quantityReceived: 10 }],
        "admin-1",
      );

      expect(prisma.stockItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { onHand: { increment: 10 } },
        }),
      );
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "purchase_in", quantity: 10 }) }),
      );
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "partially_received" } }),
      );
    });

    it("marks the PO received once every item is fully received", async () => {
      const po = basePo({
        items: [{ id: "poi-1", variantSku: "CCN-BLK-M", quantityOrdered: 10, quantityReceived: 0 }],
      });
      prisma.purchaseOrder.findUnique.mockResolvedValue(po);
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { variantSku: "CCN-BLK-M", quantityOrdered: 10, quantityReceived: 10 },
      ]);
      prisma.purchaseOrder.findUniqueOrThrow.mockResolvedValue({
        id: "po-1",
        poNumber: "PO2608000001",
        supplierId: "sup-1",
        warehouseId: "wh-1",
        status: "received",
        expectedAt: null,
        note: null,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        supplier: { id: "sup-1", name: "Fabrico" },
        warehouse: baseWarehouse(),
      });

      await service.receivePurchaseOrderItems(
        "po-1",
        [{ variantSku: "CCN-BLK-M", quantityReceived: 10 }],
        "admin-1",
      );

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "received" } }),
      );
    });

    it("rejects receiving more than the quantity ordered", async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(basePo());

      await expect(
        service.receivePurchaseOrderItems("po-1", [{ variantSku: "CCN-BLK-M", quantityReceived: 999 }], "admin-1"),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects receiving for a purchase order already received", async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(basePo({ status: "received" }));

      await expect(
        service.receivePurchaseOrderItems("po-1", [{ variantSku: "CCN-BLK-M", quantityReceived: 1 }], "admin-1"),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("reserveStock", () => {
    it("rejects a reservation when available stock is insufficient", async () => {
      prisma.stockItem.findUnique.mockResolvedValue(baseStockItem({ onHand: 10, reserved: 8 }));

      await expect(
        service.reserveStock({ warehouseId: "wh-1", variantSku: "CCN-BLK-M", quantity: 5, ttlMinutes: 15 }),
      ).rejects.toThrow(ValidationError);

      expect(prisma.stockItem.update).not.toHaveBeenCalled();
      expect(prisma.stockReservation.create).not.toHaveBeenCalled();
    });

    it("resolves the default warehouse when none is provided, and reserves stock", async () => {
      prisma.warehouse.findFirst.mockResolvedValue(baseWarehouse({ id: "wh-default", isDefault: true }));
      prisma.stockItem.findUnique.mockResolvedValue(
        baseStockItem({ warehouseId: "wh-default", onHand: 20, reserved: 0 }),
      );
      prisma.stockReservation.create.mockResolvedValue({ id: "res-1" });

      const result = await service.reserveStock({ variantSku: "CCN-BLK-M", quantity: 5, ttlMinutes: 15 });

      expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({ where: { isDefault: true } });
      expect(prisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { reserved: { increment: 5 } } }),
      );
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "reservation", quantity: 5 }) }),
      );
      expect(result).toEqual({ reservationId: "res-1" });
    });
  });

  describe("consumeReservation", () => {
    it("decrements both onHand and reserved and marks the reservation consumed", async () => {
      prisma.stockReservation.findUnique.mockResolvedValue({
        id: "res-1",
        warehouseId: "wh-1",
        variantSku: "CCN-BLK-M",
        quantity: 5,
        status: "active",
      });

      await service.consumeReservation("res-1");

      expect(prisma.stockItem.updateMany).toHaveBeenCalledWith({
        where: { warehouseId: "wh-1", variantSku: "CCN-BLK-M" },
        data: { onHand: { decrement: 5 }, reserved: { decrement: 5 } },
      });
      expect(prisma.stockReservation.update).toHaveBeenCalledWith({
        where: { id: "res-1" },
        data: { status: "consumed" },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "sale_out", quantity: 5 }) }),
      );
    });

    it("rejects consuming a reservation that is not active", async () => {
      prisma.stockReservation.findUnique.mockResolvedValue({
        id: "res-1",
        warehouseId: "wh-1",
        variantSku: "CCN-BLK-M",
        quantity: 5,
        status: "expired",
      });

      await expect(service.consumeReservation("res-1")).rejects.toThrow(ValidationError);
      expect(prisma.stockItem.updateMany).not.toHaveBeenCalled();
    });

    it("throws NotFoundError for an unknown reservation", async () => {
      prisma.stockReservation.findUnique.mockResolvedValue(null);

      await expect(service.consumeReservation("missing")).rejects.toThrow(NotFoundError);
    });
  });

  describe("releaseReservation", () => {
    it("decrements only reserved (not onHand) and marks the reservation released", async () => {
      prisma.stockReservation.findUnique.mockResolvedValue({
        id: "res-1",
        warehouseId: "wh-1",
        variantSku: "CCN-BLK-M",
        quantity: 5,
        status: "active",
      });

      await service.releaseReservation("res-1");

      expect(prisma.stockItem.updateMany).toHaveBeenCalledWith({
        where: { warehouseId: "wh-1", variantSku: "CCN-BLK-M" },
        data: { reserved: { decrement: 5 } },
      });
      expect(prisma.stockReservation.update).toHaveBeenCalledWith({
        where: { id: "res-1" },
        data: { status: "released", releasedAt: expect.any(Date) },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "release", quantity: 5 }) }),
      );
    });

    it("is a no-op for a reservation that is not active", async () => {
      prisma.stockReservation.findUnique.mockResolvedValue({
        id: "res-1",
        warehouseId: "wh-1",
        variantSku: "CCN-BLK-M",
        quantity: 5,
        status: "consumed",
      });

      await service.releaseReservation("res-1");

      expect(prisma.stockItem.updateMany).not.toHaveBeenCalled();
      expect(prisma.stockReservation.update).not.toHaveBeenCalled();
    });

    it("is a no-op for an unknown reservation (no throw)", async () => {
      prisma.stockReservation.findUnique.mockResolvedValue(null);
      await expect(service.releaseReservation("missing")).resolves.toBeUndefined();
    });
  });

  describe("releaseReservationsForCheckout", () => {
    it("releases every active reservation tied to the checkout", async () => {
      prisma.stockReservation.findMany.mockResolvedValue([
        { id: "res-1", warehouseId: "wh-1", variantSku: "SKU-A", quantity: 2, status: "active" },
        { id: "res-2", warehouseId: "wh-1", variantSku: "SKU-B", quantity: 1, status: "active" },
      ]);
      prisma.stockReservation.findUnique
        .mockResolvedValueOnce({ id: "res-1", warehouseId: "wh-1", variantSku: "SKU-A", quantity: 2, status: "active" })
        .mockResolvedValueOnce({ id: "res-2", warehouseId: "wh-1", variantSku: "SKU-B", quantity: 1, status: "active" });

      await service.releaseReservationsForCheckout("checkout-1");

      expect(prisma.stockReservation.findMany).toHaveBeenCalledWith({
        where: { checkoutId: "checkout-1", status: "active" },
      });
      expect(prisma.stockReservation.update).toHaveBeenCalledTimes(2);
    });
  });
});
