# KPI Formulas

Paid orders = status **not in** `pending_payment`, `cancelled`,
`failed` (same as the Sprint 12 ops dashboard). Range is UTC.

| Key | Label | Formula |
| --- | --- | --- |
| `revenue` | Revenue | Sum of paid-order `total` |
| `orders` | Orders | Count of paid orders |
| `aov` | AOV | Revenue ÷ paid orders |
| `conversion` | Session conversion | Distinct sessions with `order_placed` ÷ distinct sessions with `page_view` |
| `checkout_conversion` | Checkout conversion | Paid orders ÷ checkout sessions started |
| `repeat_purchase` | Repeat purchase | Users with ≥2 paid orders ÷ users with ≥1 paid order (in-range) |
| `return_rate` | Return rate | Return requests ÷ paid orders |
| `cart_abandonment` | Cart abandonment | 1 − (order-prepared checkouts ÷ checkout sessions) |
| `search_success` | Search success | Share of `SearchLog` rows with `resultCount > 0` |

Product table: `product_view` and `add_to_cart` grouped by
`properties.productSlug`. Cohorts: UTC month of first **in-range**
paid order per user, then share with ≥2 paid orders in that same range
(not a classic months-since-first-order matrix).
