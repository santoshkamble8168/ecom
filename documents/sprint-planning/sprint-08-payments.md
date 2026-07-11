# Sprint 8 - Payments

Theme: Razorpay, COD, payment lifecycle, webhooks  
Primary source volumes: Volume 6, Volume 8, Volume 9, Volume 10, Volume 12  
Status: Not Started

## Sprint Goal

Implement the payment domain with Razorpay, Cash on Delivery, payment attempts, payment lifecycle tracking, webhook validation, idempotency, retry handling, reconciliation hooks, and secure order confirmation.

## Business Outcome

Customers can pay securely through online payments or COD, while the business gets auditable payment state transitions, reliable webhook handling, and protection against duplicate or tampered payment events.

## Scope

- Payment provider abstraction with Razorpay as first online provider and COD as offline method.
- Payment initiation, authorization/capture tracking, failed payment, retry, expiry, refund-ready model, and settlement-ready model.
- Webhook endpoint with signature validation, timestamp validation, replay protection, idempotency, and event versioning.
- Order creation/finalization integration after payment success or COD confirmation.
- Payment failure UX and retry flow.

## Deliverables

### Frontend

- Payment step integration in checkout.
- Razorpay payment launch flow, COD selection, payment pending, success, failure, retry, and cancelled states.
- Order confirmation transition after successful payment/COD.
- Storybook stories for payment method selector, payment status panel, retry payment card, COD notice, and payment failure state.

### Backend

- Payment domain entities: payment, payment attempt, payment method, payment webhook, settlement.
- Provider interface and Razorpay adapter.
- COD policy and eligibility checks.
- Webhook processor using queue-backed handling where appropriate.
- Events: `PaymentInitiated`, `PaymentAuthorized`, `PaymentCaptured`, `PaymentFailed`, `PaymentWebhookReceived`, `OrderPaymentConfirmed`.

### Database

- Payment tables for payments, payment attempts, payment methods, webhooks, settlements, and idempotency records.
- Indexes for payment reference, provider order ID, provider payment ID, checkout ID, order ID, webhook event ID, and status.
- Partitioning review for payment webhooks.
- Seed payment settings for development mode.

### API

- `POST /api/v1/payments`
- `GET /api/v1/payments/{id}`
- `POST /api/v1/payments/{id}/retry`
- `POST /api/v1/payments/webhooks/razorpay`
- `POST /api/v1/checkout/{id}/cod`
- OpenAPI docs for payment lifecycle, provider payloads, webhook responses, and retry rules.

### DevOps

- Environment variables for Razorpay key ID, secret, webhook secret, provider mode, COD feature flag, retry limits, and payment expiry.
- Secure secret management plan and CI secret scanning.
- Webhook local testing setup and callback URL documentation.
- Alerting plan for payment failure spikes and webhook processing failures.

### QA

- Unit tests for provider adapter, signature verification, idempotency, COD eligibility, payment state machine, and retry rules.
- Integration tests for payment initiation, success webhook, duplicate webhook, invalid signature, failure webhook, COD confirmation, and order finalization.
- E2E tests for Razorpay mock flow, COD flow, payment failure retry, and order confirmation.
- Accessibility checks for payment selection, status announcements, error recovery, and focus after external payment return.
- Security tests for webhook replay, tampered payload, duplicate payment, and missing idempotency key.

### Documentation

- Payment lifecycle diagram.
- Razorpay integration guide.
- Webhook security documentation.
- Payment incident runbook.
- Sprint summary and security review.

## Acceptance Criteria

- Payment state transitions are explicit, validated, and auditable.
- Webhooks are signature-verified and idempotent.
- Duplicate payment events do not create duplicate orders.
- COD rules are configurable and logged.
- Payment failure and retry UX is clear and accessible.

## Dependencies

- Sprint 7 checkout.
- Sprint 9 orders will expand post-payment order management.

## Risks

- Webhook handling is security-sensitive and must reject tampered events.
- Payment provider outages require clear fallback and customer messaging.
- Reconciliation gaps can cause financial support issues.
