# Cache Strategy

Related: [ADR 0015](../decisions/0015-seo-and-cache.md)

## API (`Cache-Control` interceptor)

| Class | Policy | Examples |
| --- | --- | --- |
| Public catalog/CMS GET | `public, s-maxage=60, stale-while-revalidate=300` | products, categories, collections, cms, blog, home, navigation, search |
| Private / mutations | `private, no-store` | cart, checkout, payments, orders, auth, `/me`, `/admin`, POST/PATCH/DELETE |
| robots / sitemap | `public, max-age=3600` | `/robots.txt`, `/sitemap.xml` |

Next.js SSR catalog fetches use `next: { revalidate: 60 }` on PDP/CMS/blog.

## Nginx / CDN

- `/_next/static/` — `public, max-age=31536000, immutable`
- `/admin/` — `private, no-store` (defense in depth)
- `/api/` — origin `Cache-Control` from Nest (do not override)
- gzip for JSON, JS, CSS, XML

## Must not cache

Customer carts, checkout sessions, payment payloads, admin JSON,
analytics ingest, OTP.

There is no Redis page cache this sprint. Dashboard Redis TTL stays
Sprint 12-only.
