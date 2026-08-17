# ADR 0011: Fixed CMS Templates and Content Lifecycle

- Status: Accepted
- Date: 2026-08-17
- Sprint: Sprint 11 — CMS & Marketing

## Context

Sprint 11 needs marketing to publish homepage, landing, policy, FAQ,
blog, banners, and navigation without a deploy, with SEO metadata,
draft/schedule/publish/archive, and version history. A freeform
block/drag-drop builder would let authors produce inconsistent UI and
would not match the "fixed page templates with editable fields" choice
made for this sprint.

## Decision

**1. Fixed `PageType` templates, not a block builder.** Each type has a
documented `fields` JSON shape validated by
`validatePageFields` (`apps/api/src/cms/policies/page-fields.policy.ts`)
before write. Homepage / landing / campaign pages compose a closed
`PageSection` vocabulary (`hero_banner`, `banner_strip`,
`collection_grid`, `campaign_grid`, `rich_text`). Policy pages are
`bodyHtml`; FAQ pages are `{ question, answer, sortOrder }[]`.

**2. Content lifecycle is `draft → scheduled|published → archived`.**
Publish writes an append-only `PageVersion` snapshot. The worker
promotes `scheduled` pages/posts/banners when `scheduledAt`/`startsAt`
arrives and archives banners past `endsAt`. Public reads only return
`published` rows (plus banner window checks).

**3. Preview is token-gated, not session-gated.**
`GET /cms/pages/:slug/preview?token=` must match `CMS_PREVIEW_TOKEN`.
The storefront preview route (`/pages/[slug]/preview`) is
`noindex` and never served from the public published endpoint. Admin
CMS is `ADMIN_ACCESS` only — no dedicated `cms:*` permission (by
product choice this sprint).

**4. Storefront URLs are `/pages/:slug` for CMS pages, `/` for the
`home` homepage slug, and `/blog/:slug` for posts.** Menus are
CMS-driven (`main-nav`, `footer`) with fallback to the legacy
`/navigation` payload and then hardcoded links if the API is down.

**5. Rich HTML is sanitized on write** (`sanitizeRichHtml`) to strip
script/iframe/event-handler/`javascript:` vectors. Authors are trusted
staff; this is defense-in-depth, not a full HTML allowlist parser.

**6. Marketing foundations (referrals, gift cards, loyalty) are
placeholders** — issue/adjust APIs exist for admin demos; they are not
a full program.

## Consequences

- Authors cannot invent new section kinds without an API + storefront
  change. That is intentional: visual consistency over flexibility.
- Cache TTL for public CMS reads is Next.js `revalidate: 60` today,
  not tag-based revalidation on publish. Stale content can linger up
  to a minute after publish.
- Footer/policy vanity paths (`/privacy-policy`, `/faq`) redirect to
  `/pages/...` so seeded menu URLs and bookmarks both work.

## Revisit Triggers

- Need for a true block builder or per-brand themes.
- Tag-based on-demand revalidation (Sprint 15).
- Dedicated CMS roles (editor vs publisher) instead of `ADMIN_ACCESS`.
- DOMPurify (or equivalent) if authors need a richer HTML allowlist.
