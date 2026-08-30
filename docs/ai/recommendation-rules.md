# Recommendation rules

Related: [ADR 0016](../decisions/0016-rule-based-recommendations.md)

| Strategy | Inputs | Output | Empty fallback |
| --- | --- | --- | --- |
| `trending` | none | Newest published products | merchandised slugs, then newest |
| `similar` | `productSlug` | Same-category published products | trending |
| `complete_the_look` | `productSlug` | Same-collection published products | similar, then trending |
| `frequently_bought` | `productSlug` | Other SKUs on paid orders that also contain this product | similar |
| `recently_viewed` | `userId` or `sessionId` | Recently viewed published products | empty (no fake history) |

Disabled slots skip the rule and use `fallbackProductSlugs` immediately.

Slot keys: `homepage_trending`, `plp_trending`, `pdp_similar`,
`pdp_complete_the_look`, `cart_trending`, `cart_frequently_bought`,
`recently_viewed`.

Admins change strategy, enablement, and fallback slugs at
`/recommendations`. Changes take effect after the Redis TTL
(`RECOMMENDATION_CACHE_TTL_SECONDS`, default 60s).
