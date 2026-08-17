# Marketing Campaign Operations Playbook

Pairs with the [flash-sale playbook](./flash-sale-playbook.md) and
[CMS authoring guide](../cms/authoring-guide.md).

## Launch a collection campaign

1. Confirm inventory on featured SKUs (Stock + low-stock banner).
2. Set `ProductPrice` sale windows for SKUs whose **payable** price
   should change.
3. Create/activate the `Campaign`, attach the collection and/or SKUs.
4. Optional CMS: landing page (`type: campaign`) with `campaign_grid`
   + `hero_banner`, SEO filled per the
   [landing checklist](../cms/seo-landing-page-checklist.md).
5. Optional: homepage `campaign_grid` section; header menu item.
6. Optional coupon code for email/SMS (non-combinable, per-user limit).

## During the window

- Worker keeps `Campaign.status` in sync with `startsAt`/`endsAt`.
- If merchandising is wrong, detach SKUs/collections or end the campaign.
- If the till price is wrong, edit `ProductPrice` — that is the source
  cart/checkout uses.

## After the window

- Campaign moves to `ended`. CMS `campaign_grid` hides products for
  non-live campaigns (empty section, not an error).
- Archive or schedule-end banners so they do not linger on PLP/cart.
- Review `CouponUsage` if a code was attached.

## Placeholders (not a full program)

Admin → Marketing: referral codes (lazy create), gift cards (issue),
loyalty point adjustments. Do not treat these as production loyalty /
gift-card accounting.
