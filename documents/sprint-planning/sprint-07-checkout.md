# Sprint 7 - Checkout

Theme: Address, shipping, taxes, order review  
Primary source volumes: Volume 4, Volume 6, Volume 8, Volume 9, Volume 10, Volume 12  
Status: Not Started

## Sprint Goal

Implement a secure, low-friction checkout session with address selection, shipping serviceability, tax calculation, coupon revalidation, inventory validation, order review, and idempotent order preparation.

## Business Outcome

Customers can move from cart to order review with accurate totals, serviceable delivery options, validated address data, and clear trust signals before payment.

## Scope

- One-page checkout flow with optional login, address, delivery, payment method selection placeholder, review, and place-order preparation.
- Checkout session creation from cart with server-side total calculation.
- Address book integration, guest address support where configured, pincode serviceability, and delivery estimates.
- Tax calculation model and price breakdown.
- Inventory validation and pre-reservation interface.
- Checkout idempotency and abandoned-checkout event capture.

## Deliverables

### Frontend

- Checkout page with step sections, address selector/editor, delivery options, payment method placeholder, order summary, and trust messaging.
- Loading, validation, address-empty, serviceability-failed, stock-changed, coupon-invalid, and session-expired states.
- Mobile-first layout with sticky order summary or CTA behavior.
- Storybook stories for checkout stepper, address card, address form, delivery option, price breakdown, order review, and checkout alert.

### Backend

- Checkout domain with checkout session, shipping selection, payment selection, validation policies, and idempotency handling.
- Cart-to-checkout conversion service.
- Tax and shipping abstractions with configurable rules.
- Inventory pre-reservation interface with release strategy.
- Events: `CheckoutStarted`, `CheckoutUpdated`, `CheckoutExpired`, `InventoryPreReserved`.

### Database

- Checkout tables for checkout sessions, shipping selection, payment selection, checkout audit, and idempotency records.
- Indexes for customer/session, cart, checkout status, expiration, and idempotency key.
- Seed shipping zones, pincode serviceability, tax rules, and delivery options.

### API

- `POST /api/v1/checkout`
- `GET /api/v1/checkout/{id}`
- `PATCH /api/v1/checkout/{id}/address`
- `PATCH /api/v1/checkout/{id}/shipping`
- `PATCH /api/v1/checkout/{id}/payment-method`
- `POST /api/v1/checkout/{id}/review`
- `POST /api/v1/checkout/{id}/place-order`
- OpenAPI docs for checkout session state, idempotency, validation errors, and price breakdown.

### DevOps

- Environment variables for checkout TTL, idempotency TTL, tax settings, shipping provider mode, serviceability dataset, and reservation timeout.
- Background job for checkout expiration and reservation release.
- Health checks for Redis, database, queue, and serviceability dependencies.

### QA

- Unit tests for checkout totals, tax calculation, shipping serviceability, idempotency policy, address validation, and reservation release.
- Integration tests for create/update/review checkout, expired session, invalid coupon, stock change, and idempotent retries.
- E2E tests for cart-to-checkout, address add/select, shipping selection, review, and error recovery.
- Accessibility checks for multi-step forms, error summaries, focus movement, and keyboard-friendly address selection.
- Performance review for checkout API latency and client route weight.

### Documentation

- Checkout lifecycle and state machine.
- Tax and shipping configuration documentation.
- OpenAPI checkout docs.
- ADR for one-page checkout and idempotency.
- Sprint summary and checkout security review.

## Acceptance Criteria

- Checkout totals are calculated only on the server.
- Idempotency prevents duplicate order preparation.
- Address, shipping, coupon, tax, and inventory validations run before order placement.
- Expired sessions and stock changes are handled clearly.
- Checkout is accessible, responsive, and trust-focused.

## Dependencies

- Sprint 6 cart and coupon foundation.
- Sprint 8 payments will complete payment execution.

## Risks

- Weak idempotency can cause duplicate orders.
- Shipping and tax shortcuts can create financial reconciliation issues.
- Reservation timeout must balance stock accuracy and checkout completion.
