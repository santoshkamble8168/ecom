# Sprint 5 - Product Details

Theme: PDP, gallery, reviews, wishlist, related products  
Primary source volumes: Volume 2, Volume 4, Volume 6, Volume 7, Volume 8, Volume 9, Volume 10, Volume 11  
Status: Done (functional — formal DoD deferred)

## Deferred — revisit at end of sprint program

- Storybook PDP components
- E2E / accessibility / performance reviews
- OpenAPI docs, sprint summary, conversion-risk review
- Worker hooks for product-view aggregation
- Real inventory stock counts (stub in-stock until Sprint 10)
- Cart integration (Add to Cart placeholder until Sprint 6)
- Guest wishlist merge on login (Sprint 6)
- Review moderation admin UI
- Video gallery / zoom
- PDP analytics event pipeline (basic view tracking only for now)

## Sprint Goal

Deliver a conversion-focused product detail page with rich gallery, variant and size selection, price clarity, offers, pincode delivery check, trust signals, review foundation, wishlist action, recently viewed, related products, and complete analytics.

## Business Outcome

Customers have enough information and trust to choose a variant, verify delivery, add the item to cart or wishlist, and continue product exploration.

## Design Inputs

- PDP screenshot references: vertical thumbnail gallery, large image stage, brand/collab title area, discounted price with MRP and tax text, offer banner, size selector, size guide link, large yellow add-to-bag CTA, wishlist button, pincode check, free-shipping note, key-highlight cards, accordion details, returns/exchange trust indicators, and footer.
- Mobile rule from architecture: sticky `Add to Cart` and `Buy Now` CTAs.

## Scope

- Product detail route by slug.
- Gallery with thumbnails, zoom-ready structure, video-ready media model, keyboard navigation, and responsive behavior.
- Variant, size, quantity, price, offer, stock, delivery, and trust-signal blocks.
- Review summary and review list shell with verified-purchase model.
- Wishlist add/remove action for guests and logged-in customers.
- Related products, similar products, complete-the-look placeholder, recently viewed tracking, and PDP analytics.

## Deliverables

### Frontend

- PDP page template with gallery, product info, pricing, variants, size guide, delivery checker, CTAs, highlights, accordion details, reviews, recommendations, and recently viewed.
- Mobile sticky CTA bar and thumb-friendly controls.
- Loading skeleton, not-found state, out-of-stock state, variant-unavailable state, delivery-unavailable state, and review-empty state.
- Storybook stories for product gallery, thumbnail rail, size selector, price block, offer banner, delivery checker, trust indicators, product accordions, review summary, review card, and sticky CTA.

### Backend

- Product detail read model aggregating catalog, pricing, inventory status, reviews, SEO, and recommendation slots.
- Wishlist service integration for add/remove/status.
- Recently viewed event capture and retrieval.
- Delivery estimate contract by pincode with shipping abstraction prepared for Sprint 7 and Sprint 9.
- PDP analytics events for view, gallery interaction, variant selected, size guide opened, delivery check, add to cart, buy now, wishlist, and review expansion.

### Database

- Review tables if not already present: reviews, review media, review votes, review replies.
- Recently viewed records and product view analytics.
- Indexes for product slug, review product ID, verified purchase, rating, recently viewed customer/session, and product recommendation lookup.
- Seed reviews, highlights, specifications, and related-product mappings.

### API

- `GET /api/v1/products/{slug}`
- `GET /api/v1/products/{slug}/reviews`
- `POST /api/v1/wishlist/items`
- `DELETE /api/v1/wishlist/items/{id}`
- `POST /api/v1/recently-viewed`
- `GET /api/v1/recently-viewed`
- `POST /api/v1/delivery/estimate`
- OpenAPI docs for PDP read model, variant availability, price block, review summary, and wishlist responses.

### DevOps

- Environment variables for media CDN URL, recommendation slot limits, recently-viewed retention, pincode delivery provider stub, and review media limits.
- Worker hooks for product-view aggregation and recommendation slot refresh.
- CDN/image optimization review for gallery assets.

### QA

- Unit tests for variant availability, price display mapping, wishlist state, recently viewed rules, review eligibility, and delivery validation.
- Integration tests for PDP read model, reviews, wishlist actions, recently viewed, and delivery estimate.
- E2E tests for PDP load, gallery navigation, size selection, add to wishlist, delivery check, accordion expansion, and mobile sticky CTA.
- Accessibility checks for gallery keyboard controls, image alt text, CTAs, variant labels, pincode form errors, and accordion semantics.
- Performance review for PDP LCP image, below-the-fold lazy loading, route JS size, and API aggregation latency.

### Documentation

- PDP component mapping.
- Review model and moderation notes.
- Wishlist behavior documentation.
- OpenAPI docs for PDP and wishlist.
- Sprint summary and conversion-risk review.

## Acceptance Criteria

- PDP is complete enough to support add-to-cart integration in Sprint 6.
- Variant and stock states are visible before purchase actions.
- Wishlist works for guest and logged-in journeys according to planned merge rules.
- Recently viewed tracking does not expose private data or break anonymous sessions.
- PDP meets mobile, accessibility, SEO, and performance standards.

## Dependencies

- Sprint 2 catalog, Sprint 4 search/discovery, Sprint 1 identity for logged-in wishlist.
- Cart action may be wired as a placeholder until Sprint 6 if necessary.

## Risks

- Aggregating catalog, inventory, pricing, review, and recommendation data can become slow without read-model planning.
- PDP design complexity can create accessibility regressions in gallery and sticky CTA interactions.
