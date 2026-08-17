# Sprint 11 Summary — CMS & Marketing

Status: **Done**
Plan: `documents/sprint-planning/sprint-11-cms-marketing.md`
Related: [ADR 0011](../decisions/0011-cms-fixed-templates-and-content-lifecycle.md),
[Authoring guide](../cms/authoring-guide.md),
[SEO checklist](../cms/seo-landing-page-checklist.md),
[Marketing campaign playbook](../runbooks/marketing-campaign-playbook.md),
[Sprint 10/11 security review](../security/sprint-10-11-inventory-pricing-cms-security-review.md)

## Outcome

Marketing can publish homepage, landing/policy/FAQ pages, banners,
menus, and blog posts without a deploy. Content supports
draft / preview / schedule / publish / archive, SEO metadata, and
page version history. Navigation is CMS-driven with legacy fallback.
Referral, gift-card, and loyalty APIs exist as placeholders.

## What Was Built

### Backend

- `apps/api/src/cms` — pages, versions, banners, menus; public reads;
  admin CRUD; token preview; field-shape policy.
- `apps/api/src/blog` — posts/categories/tags; public list is paginated
  `{ posts, total, page, pageSize }`.
- `apps/api/src/marketing` — referrals, gift cards, loyalty adjust.
- HTML sanitization on page fields and blog `contentHtml`.
- Worker: scheduled publish + banner archive.
- Public product helpers: `GET /products/by-sku`,
  `GET /campaigns/:slug/products`.

### Admin

Pages editor (type-specific fields, SEO, schedule, versions), banners,
menus (tree), blog (category/tag pickers), marketing tabs.

### Storefront

CMS homepage (`home`) with legacy fallback; `/pages/[slug]`;
`/pages/[slug]/preview`; blog list/detail + related products;
CMS menus in header/footer; `category_top` / `cart_strip` banners;
`/privacy-policy` and `/faq` redirects.

### Seed

`cms.seed.ts` (`home`, `privacy-policy`, `faq`, heroes, `main-nav` /
`footer`), `blog.seed.ts` (3 posts).

### API

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/cms/pages/:slug` | public (published) |
| GET | `/cms/pages/:slug/preview?token=` | preview token |
| GET | `/cms/banners`, `/cms/menus/:code` | public |
| GET | `/blog/posts`, `/blog/posts/:slug`, `/blog/categories`, `/blog/tags` | public |
| * | `/admin/cms/*`, `/admin/blog/*`, `/admin/marketing/*` | `admin:access` |

## Coverage

- Unit: cms/blog services, page-fields policy, HTML sanitizer.
- Storybook: `HeroBanner`/`BannerStrip`, `BlogCard`, `FaqAccordion`,
  `StatusPill` content statuses.
- E2E: `admin-cms.spec.ts`, `storefront-cms.spec.ts`.

## Pending / debt

- ISR is 60s — no on-demand revalidation on publish (Sprint 15).
- Sanitizer is regex-based, not DOMPurify.
- Gift cards / loyalty / referrals are not a full program.
- Storefront preview UI is token-in-query (fine for staff; do not
  bookmark in production without rotating `CMS_PREVIEW_TOKEN`).
- No dedicated CMS editor vs publisher role.

## Definition of Done

- [x] Authors can publish homepage/landing without deploys
- [x] Draft, preview, schedule, publish, archive
- [x] SEO fields + canonical on indexable pages
- [x] CMS-driven nav with fallback
- [x] Storybook + E2E specs
- [x] Authoring guide, SEO checklist, campaign playbook, security review
