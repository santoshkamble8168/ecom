# SEO Landing Page Checklist

Use before publishing any `landing`, `campaign`, `policy`, or `homepage`
CMS page, and before publishing a blog post.

- [ ] Unique `slug` (lowercase, hyphenated). Do not reuse a retired slug
      without a redirect plan.
- [ ] `seoTitle` ≤ ~60 characters; do not keyword-stuff.
- [ ] `seoDescription` ≤ ~160 characters; describes the page, not the brand.
- [ ] `seoCanonicalUrl` set when the page is reachable from more than one
      path (e.g. vanity redirect + `/pages/:slug`).
- [ ] `seoOgImage` is an absolute HTTPS URL with meaningful `alt` on any
      in-body images / banners.
- [ ] Heading hierarchy: one `h1` (hero title or page title), then `h2`s
      in rich text. Do not skip levels.
- [ ] Banner `altText` filled; decorative banners still need a short alt.
- [ ] Internal links use site paths (`/collections/...`, `/products/...`,
      `/blog/...`) not the admin origin.
- [ ] FAQ answers are plain language (they are not HTML).
- [ ] Preview with `/pages/{slug}/preview?token=...` then publish.
- [ ] After publish, wait up to 60s for the storefront ISR cache, or
      hard-refresh.
