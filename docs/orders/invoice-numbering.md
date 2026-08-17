# Invoice Generation & Numbering

Status: Complete (Sprint 9)
Code: `apps/api/src/orders/orders.service.ts` (`ensureInvoice`,
`getInvoiceHtml`, `generateInvoiceNumber`),
`apps/api/src/orders/policies/order-state-machine.ts`

## Numbering scheme

```
generateInvoiceNumber(orderNumber) = "INV-" + orderNumber.replace(/^ECO/, "")
```

Order numbers are generated at checkout (`generateOrderNumber` in
`apps/api/src/payments/policies/payment.policy.ts`) as
`ECO{YY}{MM}{DD}{6-digit-random}`, e.g. `ECO260101123456`. The invoice
number strips the `ECO` prefix and adds `INV-`, giving
`INV-260101123456` — human-recognizable as "the invoice for order
260101123456" without a second, unrelated sequence to keep in sync.
`Invoice.invoiceNumber` is `@unique` at the database level.

This is **not** a strictly sequential invoice number (no gap-free
counter). For a GST-compliant production deployment, tax authorities
in some jurisdictions expect gap-free sequential invoice numbers per
financial year — if that becomes a hard compliance requirement, revisit
this scheme with a dedicated sequence table (`InvoiceSequence` keyed by
financial year) rather than deriving from the order number. Tracked as
a follow-up, not a Sprint 9 blocker (the MVP need is "every confirmed
order gets exactly one traceable invoice document").

## Generation timing (lazy, idempotent)

Invoices are **not** created at order-confirmation time. They're
created lazily on first access via `ensureInvoice()`:

1. `GET /orders/:id/invoice` or the account order-detail page loads →
   checks for an existing `Invoice` row (`Order.invoice`, `@unique` on
   `orderId`) → if missing, creates one from the order's frozen totals
   (`subtotal`, `discount`, `shippingFee`, `taxAmount`, `total`,
   `currency`) and the invoice number above.
2. Every subsequent call returns the same row — `ensureInvoice` never
   creates a second invoice for an order (guarded by the `@unique`
   constraint plus a `findUnique` fallback if a race loses the create).
3. Invoices are blocked for `pending_payment`/`failed` orders
   (`ValidationError("Invoice is available only for confirmed
   orders")`) — there's nothing to invoice until payment succeeds.

## Document format

`GET /orders/:id/invoice/view` renders a self-contained, printable HTML
document (`renderInvoiceHtml`) — line items, quantities, unit prices,
subtotal/discount/shipping/tax/total, and the shipping address. It is
**not** wrapped in the API's standard `{success,data}` envelope (see
`OrdersController.viewInvoice`, which uses `@Res()` to send raw HTML)
so it can be opened directly in a browser tab and printed to PDF.

This is an intentional simplification for Sprint 9: no server-side PDF
rendering library (`pdfkit`, `puppeteer`, etc.) and no persisted PDF
file. `Invoice.pdfUrl` exists in the schema for a future
Sprint-17-era upgrade (render once, store in MinIO per ADR 0007, serve
`pdfUrl` instead of re-rendering HTML on every view) but is unused
today (`null`).

## Client access

Because `invoice/view` requires the `Authorization` bearer token (it's
not a `@Public()` route — invoices contain the customer's address and
phone number), clients cannot simply `<a href>` to it. The storefront
fetches it with the token attached and opens the HTML as a blob URL
(`URL.createObjectURL`) in a new tab — see the storefront order-detail
page for the implementation.
