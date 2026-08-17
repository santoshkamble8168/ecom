# CMS Authoring Guide

Admin: `/pages`, `/banners`, `/menus`, `/blog`. Permission: `admin:access`.
See [ADR 0011](../decisions/0011-cms-fixed-templates-and-content-lifecycle.md).

## Page types

| Type | `fields` | Storefront |
| --- | --- | --- |
| `homepage` | `{ sections: PageSection[] }` | `/` (slug must be `home`) |
| `landing` / `campaign` | hero + `sections` | `/pages/:slug` |
| `policy` | `{ bodyHtml }` | `/pages/:slug` (vanity `/privacy-policy` redirects) |
| `faq` | `{ items: { question, answer, sortOrder }[] }` | `/pages/:slug` (vanity `/faq` redirects) |

## Section kinds

- `hero_banner` — `bannerId` of a published banner
- `banner_strip` — `bannerIds[]`
- `collection_grid` — `title`, `collectionSlug`, optional `limit`
- `campaign_grid` — `title`, `campaignSlug` (live campaigns only)
- `rich_text` — optional `title`, `html`

Unknown kinds are rejected on save.

## Workflow

1. Create as **draft**. Edit sections / SEO panel.
2. **Preview** (token): `http://localhost:3000/pages/{slug}/preview?token=`
   plus `CMS_PREVIEW_TOKEN` (default `dev-preview-token`). Preview is
   `noindex`.
3. **Publish** now, or **Schedule** a `scheduledAt`. The worker publishes
   when the time arrives. Publish appends a `PageVersion`.
4. **Archive** to take it off the storefront without deleting.

## Banners and menus

Banners have `placement` (`homepage_hero`, `homepage_strip`,
`category_top`, `cart_strip`) and optional `startsAt`/`endsAt`.
Menus: `main-nav` (header, supports children) and `footer`. Use
storefront paths (`/men`, `/pages/faq`, `/blog`).

## Blog

Posts support categories, tags, related product SKUs ("Shop the look"),
and the same SEO + schedule/publish flow. Public list is
`GET /blog/posts` (`{ posts, total, page, pageSize }`).

## HTML

Rich text is sanitized on save (scripts, iframes, event handlers,
`javascript:` URLs stripped). Prefer semantic tags (`p`, `h2`, `ul`,
`a`, `strong`).
