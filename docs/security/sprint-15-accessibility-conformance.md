# Sprint 15 Accessibility Conformance

Status: Partial (WCAG 2.2 AA target; automated + documented residual)

## Covered this sprint

- Skip-to-content link on the storefront root layout (`#main-content`).
- Search field `aria-label="Search products"`; cart label includes count.
- Mobile menu overlay is a button (`Close menu`), not a click-only `div`.
- `prefers-reduced-motion` disables long animations globally.
- Existing Playwright axe checks on storefront shell, admin dashboard,
  notifications, analytics, and CMS screens remain the automated gate.
- Funnel/KPI charts keep a semantic table or definition text (Sprint 14).

## Residual risk (accepted)

| # | Finding | Severity | Plan |
| --- | --- | --- | --- |
| 1 | Mobile nav is not a full focus trap. | Medium | Keyboard users can Tab into the overlay; add a trap if QA files a bug. |
| 2 | PDP still uses `<img>` in fly-to-bag and some galleries (not `next/image`). | Low | LCP budget documents AVIF/WebP for Next Image; decorative flyers are `alt=""`. |
| 3 | Admin data tables are dense; some lack `caption` besides analytics. | Low | Iterate per screen; charts already have non-color encodings. |
| 4 | No manual screen-reader pass this sprint. | Medium | Schedule with Sprint 17 production QA. |
| 5 | Strict CSP not set (Helmet defaults). | Low | ADR 0015; payment SDK origins unknown. |
| 6 | Lighthouse CI not in GitHub Actions. | Low | Budget documented; add when a preview URL exists. |
