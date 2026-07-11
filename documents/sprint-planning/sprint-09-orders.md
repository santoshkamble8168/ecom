# Sprint 9 - Orders

Theme: Order history, tracking, cancellation, returns, invoices  
Primary source volumes: Volume 4, Volume 5, Volume 6, Volume 8, Volume 9, Volume 10, Volume 12  
Status: Not Started

## Sprint Goal

Implement order management for customers and admins, including order history, order details, order timeline, tracking, cancellation, returns, exchanges, refund-ready workflows, invoices, and operational auditability.

## Business Outcome

Customers can track and manage orders without support dependency, while operations teams can fulfill, cancel, return, exchange, refund, and audit orders reliably.

## Scope

- Order aggregate with immutable order history and status transitions.
- Customer order history, order detail, shipment timeline, invoice download, cancellation request, return request, and exchange request.
- Admin order list, order detail, status update, fulfillment notes, cancellation approval, return/exchange workflow, and invoice access.
- Shipping abstraction with tracking events and courier model.
- Invoice generation model and storage.

## Deliverables

### Frontend

- Customer account order list, order detail, tracker, invoice download, cancellation flow, return flow, and exchange flow.
- Admin order dashboard with filters by status, customer, SKU, date, payment, shipment, return, and refund.
- Empty orders, delayed shipment, cancellation unavailable, return window expired, and upload-required states.
- Storybook stories for order card, order timeline, shipment tracker, invoice view, return reason form, admin order table, and order status badge.

### Backend

- Order domain with order, order items, status history, invoice, return request, exchange request, and refund hooks.
- Shipping domain with shipments, shipment items, tracking events, courier, and delivery zone.
- State machines for order, shipment, return, exchange, and refund-ready states.
- Events: `OrderPlaced`, `OrderCancelled`, `ShipmentCreated`, `ShipmentDelivered`, `ReturnRequested`, `ExchangeRequested`, `InvoiceGenerated`.

### Database

- Orders, order items, order status history, invoices, refunds, exchanges, returns, shipments, shipment items, tracking events, couriers, and delivery zones.
- Indexes for customer, order number, status, created date, shipment number, return status, and invoice number.
- Seed order statuses, return reasons, exchange reasons, couriers, and delivery zones.

### API

- `GET /api/v1/orders`
- `GET /api/v1/orders/{id}`
- `POST /api/v1/orders/{id}/cancel`
- `POST /api/v1/orders/{id}/return`
- `POST /api/v1/orders/{id}/exchange`
- `GET /api/v1/orders/{id}/invoice`
- `GET /api/v1/tracking/{shipmentNumber}`
- Admin order, shipment, return, exchange, and invoice endpoints under `/api/v1/admin`.

### DevOps

- Environment variables for invoice storage, return window, cancellation rules, courier mode, shipment tracking sync, and uploaded evidence limits.
- Worker jobs for invoice generation, shipment tracking sync, and notification triggers.
- Storage bucket policies for invoices and return media.

### QA

- Unit tests for order state machine, cancellation rules, return eligibility, exchange eligibility, invoice numbering, and shipment timeline mapping.
- Integration tests for order history, detail, cancel, return, exchange, tracking, invoice, and admin status update.
- E2E tests for order history, invoice download, cancellation request, return request, and admin order processing.
- Accessibility checks for timelines, status badges, forms, uploads, and invoice links.
- Performance review for order history pagination and admin order filters.

### Documentation

- Order lifecycle and state-machine docs.
- Returns/exchanges operations playbook.
- Invoice and numbering documentation.
- OpenAPI order docs.
- Sprint summary and operational risk review.

## Acceptance Criteria

- Order history is immutable and never destructively updated.
- Customers can view tracking and invoice details.
- Cancellation, returns, and exchanges obey configurable policy.
- Admin order actions are permission-protected and audited.
- Shipment and invoice workflows are event-driven and observable.

## Dependencies

- Sprint 8 payment confirmation.
- Sprint 13 notifications will add customer communication templates.

## Risks

- Order state shortcuts can break fulfillment and finance workflows.
- Return and exchange policies must be configurable for apparel realities.
- Invoice generation must be reliable and traceable.
