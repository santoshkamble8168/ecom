import type { PurchaseOrderStatus } from "@ecom/types";
import { ValidationError } from "@ecom/shared";

/** Terminal states: no further transitions are permitted. */
const TERMINAL_STATUSES: PurchaseOrderStatus[] = ["received", "cancelled"];

const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["ordered", "cancelled"],
  ordered: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

export function isTerminalPurchaseOrderStatus(status: PurchaseOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransitionPurchaseOrder(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertPurchaseOrderTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): void {
  if (!canTransitionPurchaseOrder(from, to)) {
    throw new ValidationError(`Cannot move purchase order from "${from}" to "${to}"`);
  }
}

/**
 * After recording receipts against a purchase order's items, decides whether
 * the PO is now fully received or only partially received. Callers are
 * expected to have already validated `from` is a non-terminal status.
 */
export function nextPurchaseOrderStatusAfterReceipt(
  items: Array<{ quantityOrdered: number; quantityReceived: number }>,
): "partially_received" | "received" {
  const fullyReceived = items.every((item) => item.quantityReceived >= item.quantityOrdered);
  return fullyReceived ? "received" : "partially_received";
}

export function generatePoNumber(now = new Date()): string {
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `PO${y}${m}${rand}`;
}
