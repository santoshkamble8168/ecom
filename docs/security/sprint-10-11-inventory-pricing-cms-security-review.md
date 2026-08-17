# Sprint 10/11 Security Review — Inventory, Pricing, CMS

Status: Complete
Reviewed: Sprint 10 (inventory, pricing, promotions) and Sprint 11
(CMS, blog, marketing foundations)
Scope: `apps/api/src/{inventory,pricing,promotions,cms,blog,marketing}`,
worker cron modules, admin inventory/pricing/CMS/blog, storefront
price display and CMS/blog rendering

## Summary

These sprints add money-adjacent controls (stock that must not go
negative, prices that must be server-owned) and a large HTML publishing
surface. One stored-XSS gap (CMS/blog HTML rendered with
`dangerouslySetInnerHTML` and no sanitizer) was found and mitigated
during this review. Remaining items are accepted risks with owners.

## Findings Fixed During This Review

| # | Finding | Severity | Fix |
| --- | --- | --- | --- |
| 1 | `RichHtml` rendered admin HTML with `dangerouslySetInnerHTML`. API `page-fields` policy only checked JSON shape; blog `contentHtml` was stored as submitted. A compromised or careless admin session could persist `<script>` / event-handler markup that every shopper would execute. | Medium | Added `sanitizeRichHtml` / `sanitizeJsonStrings` and applied them on page create/update and blog create/update. Strips `script`/`style`/`iframe`/form controls, `on*` handlers, and `javascript:` URLs. Unit tests in `sanitize-html.spec.ts`. |

## Findings Logged As Accepted Risk

| # | Finding | Severity | Rationale / Plan |
| --- | --- | --- | --- |
| 2 | HTML sanitizer is regex-based, not a real parser. Exotic payloads (mutated SVG, nested comments) may slip through. | Low | Admin-only authors. Follow-up: DOMPurify allowlist if the editor grows. Tracked in [ADR 0011](../decisions/0011-cms-fixed-templates-and-content-lifecycle.md). |
| 3 | `GET /cms/pages/:slug/preview` is public if the caller has `CMS_PREVIEW_TOKEN`. Token is a shared secret in env (default `dev-preview-token` in development). | Medium in prod if unset | Must set a strong `CMS_PREVIEW_TOKEN` in production and never ship the default. Preview pages are `noindex`. |
| 4 | CMS/blog/marketing admin APIs use `ADMIN_ACCESS` only — no editor vs publisher split. | Low | Explicit product choice this sprint. Revisit when a content team is larger than ops admins. |
| 5 | Inventory/pricing/promotion mutations are RBAC + `AuditLog`, but stock `onHand` is a cached counter. A bug that updates balance without a movement would desync the ledger. | Low | All current write paths go through one service method that writes both in a transaction. No raw SQL updates except the low-stock **read**. |
| 6 | Failed payments do not immediately release reservations (TTL sweep). A buyer who abandons checkout holds stock until expiry. | Low | Intentional so retries work. Tune TTL vs checkout length operationally. |
| 7 | `GET /campaigns/:slug/products` and `GET /products/by-sku` are public. SKU lists are not a secret, but they can be used to enumerate catalog. | Low | Same as existing PLP/search. |
| 8 | Gift-card issue / loyalty adjust have no payment capture or fraud controls. | Low | Placeholder APIs; do not enable as a real tender until Sprint 17-style hardening. |
| 9 | CMS/blog/discovery controllers are `@SkipThrottle()` like the rest of catalog. | Low | Same repo convention as Sprint 8/9 review finding #5. |
| 10 | Public CMS reads cached 60s on the storefront — stale campaign/banner possible after unpublish. | Low | Documented; on-demand revalidation is Sprint 15. |

## Strengths Confirmed

- Adjust/transfer/reserve paths reject negative available/`onHand`.
- Price and coupon math are server-side; the client cannot submit a
  payable price.
- Coupon usage is recorded at payment finalize, not at apply.
- Campaign transitions go through `assertCampaignTransition`.
- Public CMS/blog reads filter `status: published` (and banner windows).
- Preview token mismatch returns forbidden, not the draft body.
- New permissions (`inventory:*`, `pricing:*`, `promotion:*`) are
  distinct from catalog write.
- Page publish writes an append-only `PageVersion`.
- `PriceHistory` and `StockMovement` are append-only by convention
  (no update/delete APIs).

## Content governance

- Only `ADMIN_ACCESS` users can publish. There is no self-serve
  storefront CMS.
- SEO fields are optional but the authoring checklist requires them
  before go-live.
- Version history is snapshots on publish, not a full draft diff UI.
