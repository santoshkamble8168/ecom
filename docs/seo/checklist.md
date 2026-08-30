# SEO Checklist

Related: [ADR 0015](../decisions/0015-seo-and-cache.md)

Set `NEXT_PUBLIC_SITE_URL` to the public origin in production.

| Page type | Route | Metadata | Canonical | JSON-LD | Sitemap |
| --- | --- | --- | --- | --- | --- |
| Home | `/` | default title/description | `/` | Organization, WebSite | yes |
| PLP gender | `/men`, `/women` | title + description | self | — | yes |
| Category / collection | `/categories/[slug]`, `/collections/[slug]` | from slug | self | — | yes |
| Search | `/search` | title | `/search` | SearchAction on layout | yes |
| PDP | `/products/[slug]` | product SEO fields | product or self | Product, BreadcrumbList | yes |
| CMS | `/pages/[slug]` | page SEO fields | page or self | FAQPage when `type=faq` | yes |
| Blog post | `/blog/[slug]` | post SEO fields | post or self | Article, BreadcrumbList | yes |
| Cart / checkout / account / wishlist / order | those paths | `robots: noindex` | — | — | no |

Redirects: `/faq` → `/pages/faq`, `/privacy-policy` → `/pages/privacy-policy`.

Crawlers: storefront `/robots.txt` and `/sitemap.xml`. API origin serves
the same files at `/robots.txt` and `/sitemap.xml` (not under `api/v1`).
