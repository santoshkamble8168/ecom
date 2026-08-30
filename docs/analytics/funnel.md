# Conversion Funnel

Sequential by session. A session counts at step N only if it already
reached step N−1 at an earlier or equal timestamp.

| Step | Event mapping |
| --- | --- |
| Homepage | `page_view` path `/` |
| PLP | `page_view` path matching `/men`, `/women`, `/search`, `/categories`, `/collections` |
| PDP | `product_view` |
| Cart | `add_to_cart` |
| Checkout | `checkout_start` |
| Payment | `payment_attempt` |
| Order | `order_placed` |

Admin: `GET /api/v1/admin/analytics/funnels?from&to`.

MVP loads matching events for the range into memory. When this is too
slow, switch the query to `AnalyticsDailyAggregate` or a session-step
rollup. Do not treat later-step-only sessions (e.g. `order_placed`
without homepage) as a complete funnel.
