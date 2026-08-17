# Audit Log Dictionary

`AuditLog` is append-only. List/export: `GET /admin/audit-logs` and
`GET /admin/audit-logs/export`. Correlation search uses
`correlationId` → column `requestId` (`x-request-id` on the API
envelope). Sprint 12 added `ipAddress`, `before`, `after`, and
indexes on `action`, `createdAt`, `requestId`.

Older call sites may leave `ipAddress` / `before` / `after` null.
Sprint 12 customer, flag, settings, and export writes populate
`before`/`after` when state changes.

## Fields

| Field | Meaning |
| --- | --- |
| `userId` / `actorEmail` | Actor; null for system/unauthenticated |
| `action` | Exact string in the tables below (list filter is case-insensitive contains) |
| `entityType` / `entityId` | Target row |
| `metadata` | Extra JSON (amounts, method, etc.) |
| `requestId` | Correlation ID |
| `ipAddress` | Client IP when the writer passed it |
| `before` / `after` | JSON snapshots for mutations |
| `createdAt` | UTC timestamp |

Retention: `AUDIT_RETENTION_DAYS` (default 365). CSV export requires
`audit:export` and can include PII from `before`/`after`/metadata.

## Sprint 12 — admin operations

| Action | Entity | When |
| --- | --- | --- |
| `customer.note_added` | `user` | `POST /admin/customers/:id/notes` |
| `customer.status_changed` | `user` | `PATCH /admin/customers/:id/status` |
| `feature_flag.updated` | `feature_flag` | `PATCH /admin/feature-flags/:key` |
| `settings.updated` | `settings` | `PATCH /admin/settings` |
| `report.export_queued` | `report` | `POST /admin/reports/:id/export` |

## Auth and users

| Action | Entity | When |
| --- | --- | --- |
| `auth.login` | `user` | OTP/Google login |
| `auth.logout` | `user` | Refresh token revoked |
| `auth.otp_failed` | `user` | Failed OTP verify |
| `user.roles_assigned` | `user` | Admin role assignment |
| `profile.updated` | `user` | Customer profile PATCH |
| `address.created` / `updated` / `deleted` | `address` | Address book |

## Checkout, payments, orders

| Action | Entity | When |
| --- | --- | --- |
| `CheckoutStarted` / `CheckoutUpdated` / `CheckoutOrderPrepared` | `checkout` | Checkout session |
| `PaymentInitiated` / `PaymentFailed` / `PaymentWebhookReceived` / `OrderPaymentConfirmed` | `payment` | Payment lifecycle |
| `AdminRefundIssued` | `refund` | Admin refund |
| `OrderCancelled` | `order` | Customer cancel |
| `AdminOrderStatusUpdated` | `order` | Admin status transition |
| `ShipmentCreated` / `TrackingEventAdded` | `shipment` | Fulfillment |
| `ReturnRequested` / `ReturnApproved` / `ReturnRejected` / `ReturnItemReceived` / `ReturnRefunded` | `return_request` | Returns |
| `ExchangeRequested` / `ExchangeApproved` / `ExchangeRejected` / `ExchangeItemReceived` / `ExchangeCompleted` | `exchange_request` | Exchanges |

## Inventory, pricing, promotions

| Action | Entity | When |
| --- | --- | --- |
| `WarehouseCreated` / `WarehouseUpdated` | `warehouse` | Warehouse admin |
| `StockAdjusted` / `StockTransferred` | `stock` | Stock mutations |
| `SupplierCreated` | `supplier` | Supplier create |
| `PurchaseOrderCreated` / `PurchaseOrderStatusUpdated` / `PurchaseOrderReceived` | `purchase_order` | PO flow |
| `PriceListCreated` | `price_list` | Price list create |
| `TaxRuleCreated` / `TaxRuleUpdated` | `tax_rule` | Tax rules |
| `CouponCreated` / `CouponUpdated` | `coupon` | Coupons |
| `CampaignCreated` | `campaign` | Campaign create |
| `CampaignProductsAttached` / `CampaignProductDetached` | `campaign` | SKU attachments |
| `CampaignCollectionsAttached` / `CampaignCollectionDetached` | `campaign` | Collection attachments |

## CMS, blog, marketing

| Action | Entity | When |
| --- | --- | --- |
| `PageCreated` / `PageUpdated` / `PagePublished` / `PageScheduled` / `PageArchived` | `page` | CMS pages |
| `BannerCreated` / `BannerUpdated` / `BannerPublished` | `banner` | Banners |
| `MenuCreated` / `MenuItemCreated` / `MenuItemUpdated` / `MenuItemDeleted` | `menu` | Menus |
| `BlogPostCreated` / `BlogPostUpdated` / `BlogPostPublished` / `BlogPostScheduled` | `blog_post` | Blog |
| `BlogCategoryCreated` / `BlogTagCreated` | `blog_category` / `blog_tag` | Taxonomy |
| `GiftCardCreated` | `gift_card` | Placeholder gift cards |
| `LoyaltyPointsAdjusted` | `loyalty` | Placeholder loyalty |

## How to investigate

1. Start from the failing request’s `requestId` (response envelope or
   `x-request-id`) → filter `correlationId`.
2. Or filter `entityType` + `entityId` (order, customer, flag key).
3. Compare `before`/`after` on Sprint 12 mutations.
4. Export CSV only when needed; treat the file as sensitive.
