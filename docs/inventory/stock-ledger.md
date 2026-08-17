# Inventory Ledger

Source of truth: `StockItem` (current balances) + `StockMovement`
(append-only history). See [ADR 0010](../decisions/0010-inventory-ledger-and-price-resolution.md).

## Balances

| Field | Meaning |
| --- | --- |
| `onHand` | Physical units in the warehouse |
| `reserved` | Units held for in-flight checkouts |
| available | `onHand - reserved` (never stored; computed) |
| `lowStockThreshold` | Alert when `onHand <= threshold` |

Available stock cannot be reserved beyond what is free. Adjustments
cannot drive `onHand` below zero.

## Movement types

`adjustment_in`, `adjustment_out`, `transfer_out`, `transfer_in`,
`reservation`, `release`, `sale` (consume on payment), `receipt`
(purchase-order receive). Each row stores warehouse, SKU, quantity,
optional note, actor (`admin` / `system`), and a reference
(`checkout`, `purchase_order`, `stock_reservation`, …).

## Reservations

Created at `placeOrder` for the default warehouse (MVP: one warehouse
per SKU reservation). TTL is owned by `expiresAt`. The worker releases
expired `active` rows every minute and writes a `release` movement.

## Purchase orders

Status machine: `draft → ordered → partially_received|received`, or
`cancelled` from non-received states. Receiving increments `onHand`
and writes `receipt` movements. See the
[stock adjustment playbook](../runbooks/stock-adjustment-playbook.md).
