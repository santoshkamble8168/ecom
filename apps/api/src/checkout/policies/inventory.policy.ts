import { ValidationError } from "@ecom/shared";

/**
 * Basic per-line sanity check (order limits), independent of real stock
 * availability. Actual stock holds/consumption live in `InventoryService`
 * (`reserveStock`/`consumeReservation`/`releaseReservation`), wired in by
 * `CheckoutService`/`PaymentsService`.
 */
export function validateInventory(items: Array<{ variantSku: string; quantity: number }>): void {
  for (const item of items) {
    if (item.quantity < 1 || item.quantity > 10) {
      throw new ValidationError(`Invalid quantity for ${item.variantSku}`);
    }
  }
}
