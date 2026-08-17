/** Inventory domain (Sprint 10): warehouses, stock ledger, reservations, suppliers, purchase orders. */

export type StockMovementType =
  | "purchase_in"
  | "sale_out"
  | "return_in"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer_in"
  | "transfer_out"
  | "reservation"
  | "release";

export type StockReservationStatus = "active" | "released" | "consumed" | "expired";

export type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

export interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface StockItemSummary {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  variantSku: string;
  productTitle: string | null;
  onHand: number;
  reserved: number;
  available: number;
  safetyStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  updatedAt: string;
}

export interface StockMovementSummary {
  id: string;
  warehouseId: string;
  variantSku: string;
  type: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  actorType: "customer" | "admin" | "system";
  actorId: string | null;
  createdAt: string;
}

export interface StockAdjustmentInput {
  warehouseId: string;
  variantSku: string;
  /** Positive to increase on-hand, negative to decrease. */
  delta: number;
  note?: string;
}

export interface StockTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  variantSku: string;
  quantity: number;
  note?: string;
}

export interface SupplierSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseOrderItemSummary {
  id: string;
  variantSku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: string;
}

export interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: PurchaseOrderStatus;
  expectedAt: string | null;
  note: string | null;
  items: PurchaseOrderItemSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  expectedAt?: string;
  note?: string;
  items: Array<{ variantSku: string; quantityOrdered: number; unitCost: string }>;
}

export interface ReceivePurchaseOrderItemInput {
  variantSku: string;
  quantityReceived: number;
}

export interface LowStockAlert {
  warehouseId: string;
  warehouseName: string;
  variantSku: string;
  productTitle: string | null;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
}
