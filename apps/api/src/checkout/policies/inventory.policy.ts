import { ValidationError } from "@ecom/shared";

/** Stub until Sprint 10 inventory ledger — always passes in dev. */
export function validateInventory(items: Array<{ variantSku: string; quantity: number }>): void {
  for (const item of items) {
    if (item.quantity < 1 || item.quantity > 10) {
      throw new ValidationError(`Invalid quantity for ${item.variantSku}`);
    }
  }
}

export function preReserveInventory(_checkoutId: string): void {
  // Sprint 10: reserve stock with TTL and release on expiry.
}

export function releaseInventoryReservation(_checkoutId: string): void {
  // Sprint 10: release reserved stock.
}
