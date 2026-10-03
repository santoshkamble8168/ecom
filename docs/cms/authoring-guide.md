# CMS Authoring Guide

The admin at `http://localhost:3001` is a content studio: Content, Pages, Dynamic Pages, Media, Menus, and Reusable Sections. Commerce screens remain in the codebase but are not part of this navigation.

Permission: `admin:access`. See [ADR 0011](../decisions/0011-cms-fixed-templates-and-content-lifecycle.md).

## Editorial workflow

1. Create a page or dynamic page.
2. Add blocks (or fill a template’s slots). The URL is generated from the title and can be edited.
3. Save draft. Leaving the editor with unsaved changes asks for confirmation.
4. Preview opens the storefront preview route. Desktop and mobile widths are available in the preview dialog.
5. Publish, unpublish, archive, or schedule. Each publish stores a revision that can be restored.

Statuses are Draft, Scheduled, Published, and Archived. Delete hides the page from the site and the content list.

## Pages and dynamic pages

Static pages (About, Contact, policies, FAQ, homepage) are edited as a stack of blocks. Dynamic pages use a developer-defined template:

| Template | Public URL | Locked slot |
| --- | --- | --- |
| Collection | `/collections/:slug` | Product grid |
| Category | `/categories/:slug` | Product grid |
| Campaign | `/campaign/:slug` | Product grid |
| Landing | `/pages/:slug` | None |
| Blog | `/blog` when the slug is `blog` | None |

The catalog slug on a dynamic page selects which collection, category, or campaign supplies the grid. Changing the template in code changes the slot order for every page using it. Page-specific blocks live under “Page overrides”. A Custom Section can stay linked to a reusable section or be detached into a local copy.

## Blocks

Heading, Paragraph, Image, Video, Button, Banner, Gallery, Columns, Testimonials, FAQ, Custom Section, and Product Grid. Each block has alignment, spacing, colors, and desktop/mobile visibility. Images are chosen from the Media library.

## Media and menus

Upload images in Media and reuse the same asset on any page. Deletion is blocked while a page or reusable section still references the file. Menus can link to an existing page or a custom URL. `main-nav` and `footer` remain the storefront menu codes.

## Legacy fields

Older homepage, landing, campaign, policy, and FAQ records that do not use `fields.editor = "blocks"` still render with their original section shapes. New pages always save a block document. Preview still requires `CMS_PREVIEW_TOKEN`. Set `ADMIN_ORIGIN` (default `http://localhost:3001`) so the storefront allows the admin preview frame.

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
