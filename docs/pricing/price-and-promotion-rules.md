# Pricing and Promotion Rules

See [ADR 0010](../decisions/0010-inventory-ledger-and-price-resolution.md)
and the [flash-sale playbook](../runbooks/flash-sale-playbook.md).

## Effective price

For a variant on the default price list:

1. If `salePrice` is set and `now` is inside `[saleStartsAt, saleEndsAt]`,
   effective price is `salePrice` and `saleActive` is true.
2. Otherwise effective price is `sellingPrice`.
3. If no `ProductPrice` row exists, catalog `Product.basePrice` is used.

Tax: highest-priority active `TaxRule` for the product category, else
the sitewide (`categoryId = null`) rule, else `0`.

Every admin price write appends `PriceHistory`.

## Coupons

Validated by `PromotionsService.validateCouponForUser` (used by cart
and checkout). Checks: active, date window, min order, per-user and
global usage limits, combinability with already-applied codes,
category/collection eligibility. Redemption is recorded as
`CouponUsage` only after payment finalizes.

Seeded demo codes include `WELCOME10`, `FLAT100`, `FREESHIP`, `VIP20`
(non-combinable, per-user limit 1), `COMBO5` (combinable).

## Campaigns

State machine: `scheduled → active|cancelled`, `active → ended|cancelled`.
The worker activates when `startsAt` is reached and ends when `endsAt`
passes. Live campaigns contribute a `campaignBadge` (e.g. `15% OFF`)
on matching PLP/PDP cards and a public
`GET /campaigns/:slug/products` listing for CMS `campaign_grid`
sections.

Campaign discounts currently surface as merchandising (badge +
campaign product grid). Cart-line campaign markdown on top of
`ProductPrice.salePrice` is **not** stacked automatically — put the
sale on `ProductPrice` when the campaign should change the payable
amount.
