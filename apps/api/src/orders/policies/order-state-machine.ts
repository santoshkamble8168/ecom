import { ValidationError } from "@ecom/shared";
import type { OrderStatus } from "@prisma/client";

export const RETURN_WINDOW_DAYS = Number(process.env.ORDER_RETURN_WINDOW_DAYS ?? 7);
export const EXCHANGE_WINDOW_DAYS = Number(process.env.ORDER_EXCHANGE_WINDOW_DAYS ?? 7);

/** States before a shipment leaves the warehouse — cancellation is always safe here. */
const CANCELLABLE_STATUSES: OrderStatus[] = ["pending_payment", "confirmed", "processing"];

/** Terminal states: no further transitions are permitted. */
const TERMINAL_STATUSES: OrderStatus[] = ["cancelled", "failed", "returned", "exchanged"];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["confirmed", "cancelled", "failed"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["return_requested", "exchange_requested"],
  return_requested: ["returned", "delivered"],
  exchange_requested: ["exchanged", "delivered"],
  returned: [],
  exchanged: [],
  cancelled: [],
  failed: [],
};

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new ValidationError(`Cannot move order from "${from}" to "${to}"`);
  }
}

export function assertCancellable(status: OrderStatus): void {
  if (!CANCELLABLE_STATUSES.includes(status)) {
    throw new ValidationError(
      "This order can no longer be cancelled — it has already shipped. You can request a return once it's delivered.",
    );
  }
}

function windowEndsAt(deliveredAt: Date, days: number): Date {
  return new Date(deliveredAt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function assertReturnEligible(status: OrderStatus, deliveredAt: Date | null, now = new Date()): void {
  if (status !== "delivered") {
    throw new ValidationError("Returns can only be requested for delivered orders");
  }
  if (!deliveredAt) {
    throw new ValidationError("Delivery date is missing for this order");
  }
  if (now > windowEndsAt(deliveredAt, RETURN_WINDOW_DAYS)) {
    throw new ValidationError(`Return window of ${RETURN_WINDOW_DAYS} days has expired for this order`);
  }
}

export function assertExchangeEligible(status: OrderStatus, deliveredAt: Date | null, now = new Date()): void {
  if (status !== "delivered") {
    throw new ValidationError("Exchanges can only be requested for delivered orders");
  }
  if (!deliveredAt) {
    throw new ValidationError("Delivery date is missing for this order");
  }
  if (now > windowEndsAt(deliveredAt, EXCHANGE_WINDOW_DAYS)) {
    throw new ValidationError(`Exchange window of ${EXCHANGE_WINDOW_DAYS} days has expired for this order`);
  }
}

export function isReturnEligible(status: OrderStatus, deliveredAt: Date | null, now = new Date()): boolean {
  try {
    assertReturnEligible(status, deliveredAt, now);
    return true;
  } catch {
    return false;
  }
}

export function isExchangeEligible(status: OrderStatus, deliveredAt: Date | null, now = new Date()): boolean {
  try {
    assertExchangeEligible(status, deliveredAt, now);
    return true;
  } catch {
    return false;
  }
}

export function isCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export function returnWindowEndsAt(deliveredAt: Date | null): Date | null {
  return deliveredAt ? windowEndsAt(deliveredAt, RETURN_WINDOW_DAYS) : null;
}

export function exchangeWindowEndsAt(deliveredAt: Date | null): Date | null {
  return deliveredAt ? windowEndsAt(deliveredAt, EXCHANGE_WINDOW_DAYS) : null;
}

export function generateInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber.replace(/^ECO/, "")}`;
}

export function generateShipmentNumber(now = new Date()): string {
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `SHP${y}${m}${rand}`;
}
