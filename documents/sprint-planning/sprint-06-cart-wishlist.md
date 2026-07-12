# Sprint 6 - Cart & Wishlist

Theme: Cart, save for later, guest cart, coupons  
Primary source volumes: Volume 4, Volume 6, Volume 8, Volume 9, Volume 10, Volume 11  
Status: Done (functional — formal DoD deferred)

## Deferred — revisit at end of sprint program

- Mini-cart drawer, Storybook, E2E, accessibility audit
- Redis cart caching, abandoned-cart jobs, cart TTL cleanup
- Real inventory stock validation (stub until Sprint 10)
- Guest wishlist → user merge on login (basic cart merge only for now)
- OpenAPI docs, sprint summary, fraud/abuse review
- Optimistic UI rollback (basic refresh-on-action for now)

## Sprint Goal

Implement cart and wishlist flows for guests and authenticated customers, including cart persistence, cart merge, quantity updates, save for later, coupon application, shipping progress, price summary, validation, and conversion-focused empty/error states.

## Business Outcome

Customers can confidently collect products, adjust quantities, save items for later, apply offers, and move toward checkout without losing cart state.

## Scope

- Guest cart, logged-in cart, cart merge after login, cart expiration, and cart recovery planning.
- Add to cart from PDP and product cards, quantity updates, remove item, variant validation, and stock validation.
- Wishlist list page, wishlist add/remove, move to cart, and share-ready structure.
- Save for later from cart.
- Coupon application/removal with promotion abstraction prepared for Sprint 10 and Sprint 11.
- Cart recommendations and free-shipping progress messaging.

## Deliverables

### Frontend

- Cart page, mini-cart/drawer, wishlist page, save-for-later section, coupon input, shipping progress, and price summary.
- Guest and logged-in state handling.
- Empty cart, empty wishlist, coupon invalid, stock changed, item unavailable, and cart conflict states.
- Optimistic UI for wishlist and cart actions with rollback on failure.
- Storybook stories for cart item, cart summary, coupon input, shipping progress, wishlist item, save-for-later item, mini-cart, empty cart, and conflict alert.

### Backend

- Cart domain for carts, cart items, applied coupons, saved carts, and merge policy.
- Wishlist service for customer/session-owned wishlist items.
- Promotion validation interface for coupon eligibility, usage limits, combinability, and expiry.
- Inventory validation interface for available stock and reservation readiness.
- Events: `CartCreated`, `CartItemAdded`, `CartItemRemoved`, `CartAbandoned`, `CouponApplied`, `WishlistItemAdded`.

### Database

- Cart tables: carts, cart items, applied discounts, saved carts, cart sessions, and cart audit metadata.
- Wishlist tables and recently viewed integration if not completed in Sprint 5.
- Indexes for customer/session cart lookup, cart expiration, product variant, coupon code, and wishlist uniqueness.
- Seed coupons for development scenarios: welcome, free shipping, invalid/expired, and minimum-cart-value cases.

### API

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/{id}`
- `DELETE /api/v1/cart/items/{id}`
- `POST /api/v1/cart/coupons`
- `DELETE /api/v1/cart/coupons/{code}`
- `POST /api/v1/cart/save-for-later`
- `POST /api/v1/cart/merge`
- Wishlist endpoints from Sprint 5 extended for list and move-to-cart.

### DevOps

- Environment variables for cart TTL, guest cart cookie, coupon limits, abandoned-cart retention, and free-shipping threshold.
- Redis caching strategy for active cart reads if needed.
- Scheduled job planning for abandoned carts and expired cart cleanup.

### QA

- Unit tests for cart pricing, quantity rules, merge policy, coupon validation, save-for-later, and wishlist uniqueness.
- Integration tests for guest cart, authenticated cart, cart merge, coupon apply/remove, stock validation, and authorization.
- E2E tests for add to cart from PDP, quantity update, coupon application, move wishlist item to cart, save for later, and empty states.
- Accessibility checks for quantity controls, cart updates, coupon errors, live region announcements, and drawer focus management.
- Performance review for cart API response time and optimistic UI rollback.

### Documentation

- Cart lifecycle documentation.
- Coupon validation contract.
- Guest-to-customer cart merge ADR.
- OpenAPI cart/wishlist docs.
- Sprint summary and fraud/abuse review.

## Acceptance Criteria

- Cart persists for guests and logged-in customers.
- Cart merge behavior is deterministic and tested.
- Coupon validation is server-owned and auditable.
- Cart state never trusts client-side totals.
- Wishlist and save-for-later flows are responsive, accessible, and recoverable.

## Dependencies

- Sprint 5 PDP and wishlist action.
- Sprint 10 will expand promotions and inventory; this sprint uses stable interfaces and basic rules.

## Risks

- Client-calculated totals can create pricing vulnerabilities.
- Cart merge edge cases can create duplicate items or lost carts.
- Coupon logic must not become hardcoded before the pricing engine matures.
