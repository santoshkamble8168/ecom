# Stock Adjustment Playbook

Audience: warehouse / ops admins with `inventory:write`.

## When to use Adjust vs Transfer vs PO receive

- **Adjust** — cycle count, damage, found stock. Requires a note.
  Cannot take `onHand` below zero.
- **Transfer** — move units between warehouses (e.g. MUM1 → DEL1).
  Source available (`onHand - reserved`) must cover the quantity.
- **Purchase order receive** — inbound from a supplier. Create a PO
  in `draft`, move to `ordered`, then receive line quantities. Partial
  receipts move the PO to `partially_received`.

## Adjust stock

1. Admin → Inventory → Stock.
2. Filter by warehouse / SKU if needed. Low-stock rows show a warning
   badge; the banner lists SKUs at or below threshold.
3. Adjust Stock → warehouse, SKU, signed delta, note → confirm.
4. Confirm the new available quantity and a new Movements row
   (`adjustment_in` or `adjustment_out`).

## If an adjustment is rejected

"Adjustment would result in negative stock on hand" means the delta
is larger than current `onHand`. Receive a PO or transfer in first,
or split the write-off. There is no override this sprint.

## Low-stock follow-up

The worker logs a warning hourly. The admin banner is the operational
signal — create or receive a PO against the SKU.
