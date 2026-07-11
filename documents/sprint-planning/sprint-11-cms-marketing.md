# Sprint 11 - CMS & Marketing

Theme: Banners, blogs, landing pages, collections  
Primary source volumes: Volume 1, Volume 3, Volume 4, Volume 5, Volume 9, Volume 10, Volume 11  
Status: Not Started

## Sprint Goal

Build the CMS and marketing engine for conversion, SEO, and campaign operations: banners, homepage sections, landing pages, blogs, navigation, policy pages, campaign collections, referrals foundation, loyalty hooks, and marketing analytics.

## Business Outcome

Marketing and content teams can launch campaigns, SEO pages, blogs, and homepage changes without developer intervention, improving organic acquisition, retention, and average order value.

## Scope

- CMS authoring for homepage, landing pages, banners, blogs, FAQs, policy pages, navigation menus, and SEO pages.
- Campaign management for homepage campaigns, collection campaigns, product campaigns, scheduled banners, and promotional sections.
- Blog and content SEO with related products and internal linking.
- Referral and loyalty foundation hooks without full advanced program rollout if deferred.
- Admin preview, draft, schedule, publish, archive, and version history.

## Deliverables

### Frontend

- Storefront rendering for CMS pages, campaign landing pages, blog list/detail, banners, FAQ, policies, and dynamic navigation.
- Admin CMS editor shell for sections, banners, pages, blogs, menus, and campaign blocks.
- Preview mode, draft status indicators, and scheduled content display rules.
- Storybook stories for banner, hero section, campaign card, blog card, CMS rich section, FAQ accordion, landing page template, and preview badge.

### Backend

- CMS domain with page, page section, banner, blog, category, tag, menu, and navigation item.
- Marketing domain with campaign, referral program foundation, gift card placeholder, loyalty rule placeholder, and customer campaign hooks.
- Versioning, scheduling, audit logs, and publish workflow.
- Events: `ContentPublished`, `BannerScheduled`, `CampaignStarted`, `CampaignEnded`, `BlogPublished`.

### Database

- CMS and marketing schema migrations for pages, page sections, banners, blogs, blog categories, blog tags, menus, navigation items, campaigns, campaign products, campaign collections, referrals, gift cards, loyalty rules, and customer campaigns.
- Indexes for slug, status, publish window, menu location, campaign status, blog tags, and SEO metadata.
- Seed homepage CMS blocks, banners, blog categories, policy pages, campaign examples, and landing pages such as `/oversized-tshirts` and `/anime-tshirts`.

### API

- Public CMS read endpoints for pages, blogs, banners, menus, and landing pages.
- Admin CMS CRUD endpoints for pages, sections, blogs, banners, menus, and campaigns.
- OpenAPI docs for CMS block schema, scheduling, preview, SEO metadata, and campaign eligibility.

### DevOps

- Environment variables for preview token, CMS cache TTL, revalidation secret, campaign cache TTL, and content media limits.
- Cache invalidation and revalidation strategy after publish.
- Worker jobs for scheduled publish/unpublish and campaign activation.

### QA

- Unit tests for publish workflow, scheduling, slug uniqueness, content validation, campaign eligibility, and SEO metadata.
- Integration tests for CMS CRUD, preview, publish, scheduled banner, blog, menu, and landing page rendering.
- E2E tests for admin content publish, homepage banner update, blog publishing, landing page view, and preview mode.
- Accessibility checks for CMS-rendered headings, links, accordions, alt text, and rich content.
- Performance review for CMS page caching, landing page LCP, and content revalidation.

### Documentation

- CMS authoring guide.
- Marketing campaign operations playbook.
- SEO landing page checklist.
- OpenAPI CMS/marketing docs.
- Sprint summary and content-governance review.

## Acceptance Criteria

- Marketing can publish homepage and landing content without code deployments.
- CMS content supports draft, preview, schedule, publish, and archive states.
- Every indexable CMS page supports SEO metadata and canonical URLs.
- Navigation and footer links are CMS-driven.
- Campaigns are auditable and cache invalidation is reliable.

## Dependencies

- Sprint 3 homepage shell.
- Sprint 10 campaign and promotion foundations.

## Risks

- CMS flexibility can create inconsistent UI if section schemas are too loose.
- Content publishing must not bypass SEO, accessibility, or approval rules.
- Cache invalidation mistakes can show stale campaign content.
