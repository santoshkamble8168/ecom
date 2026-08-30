# Analytics Event Taxonomy

Related: [ADR 0014](../decisions/0014-analytics-ingest-and-retention.md),
[KPI formulas](./kpi-formulas.md), [funnel](./funnel.md)

Client events use the shared session cookie key `ecom_session_id`.
Server events reuse cart/checkout `sessionId` when present, otherwise
`userId` or `"server"`.

| Name | Source | Typical properties | Funnel step |
| --- | --- | --- | --- |
| `page_view` | Storefront route change | — | homepage (`/`) or PLP (`/men`, `/women`, `/search`, `/categories`, `/collections`) |
| `search` | Discovery `SearchLog` dual-write | `query`, `resultCount` | — |
| `filter` | PLP filter change | `sizes`, `colors`, `brands`, `minPrice`, `maxPrice`, `onSale` | — |
| `product_view` | PDP mount | `productSlug` | PDP |
| `variant_select` | PDP size/option click | `productSlug`, `attribute`, `value` | — |
| `wishlist_add` | `WishlistService.add` | `productSlug`, `variantSku` | — |
| `add_to_cart` | `CartService.addItem` | `productSlug`, `variantSku`, `quantity` | cart |
| `checkout_start` | `CheckoutService.create` | `checkoutId`, `total` | checkout |
| `payment_attempt` | Payments initiate / fail | `paymentId`, `method` or `status` | payment |
| `order_placed` | `finalizeOrder` | `orderId`, `orderNumber`, `total` | order |
| `review_submit` | Taxonomy only | — | — (no review write API yet) |
| `return_request` | `OrdersService.requestReturn` | `orderId`, `orderNumber` | — |
| `campaign_click` | Banner / hero CTA | `campaignId`, `href` | — |
| `recommendation_view` | Recommendation rail mount | `slot`, `productCount` | — |
| `recommendation_click` | Recommendation product click | `slot`, `productSlug` | — |
| `semantic_search` | Search `mode=semantic` and flag on | `query`, `provider` | — |

Ingest body: `{ events: AnalyticsEventInput[] }` (max 25). Each event
needs `clientEventId` (UUID), `name`, `sessionId`. Optional `path`,
`occurredAt`, `properties`.

Debug: `NEXT_PUBLIC_ANALYTICS_DEBUG=true` or
`localStorage.ecom_analytics_debug = "1"`.
