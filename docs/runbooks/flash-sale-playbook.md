# Flash Sale Playbook

Audience: merchandising admins with `pricing:write` and
`promotion:write`.

## Payable sale price (required for the till)

1. Admin → Pricing → Prices. Edit the variant.
2. Set `salePrice`, `saleStartsAt`, `saleEndsAt`. Save.
3. `PriceHistory` records the change. Storefront PLP/PDP/cart pick up
   the effective price once `now` is inside the window (API resolves
   live; the worker also clears expired sale fields every 5 minutes).

## Campaign merchandising (badge + CMS grid)

1. Admin → Campaigns → create (`collection` or `product` type),
   schedule window, percent/fixed discount fields.
2. Attach collections and/or SKUs.
3. Leave status `scheduled`; the worker flips to `active` at `startsAt`.
   Manual `scheduled → active` is also allowed.
4. Optional: add a CMS homepage/landing `campaign_grid` section with
   the campaign slug.

Campaign badges (`15% OFF`, `Sale`, or the campaign name) appear on
matching product cards. They do **not** by themselves change cart
totals — pair with a `ProductPrice` sale (above) or a coupon.

## Coupon flash codes

Admin → Coupons. Prefer a unique code, `perUserLimit: 1`, and
`combinable: false` for a one-shot sale code. Cart/checkout revalidate
on every totals refresh; usage is recorded only after payment.

## Rollback

- End a campaign: set status `ended` or `cancelled`.
- End a price sale: clear `salePrice` / window, or wait for `saleEndsAt`.
- Disable a coupon: `isActive = false`.
