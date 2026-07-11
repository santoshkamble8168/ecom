Enterprise Commerce Platform Blueprint
Volume 8
Enterprise Domain Model & Business Entities

Version: 1.0

Purpose: Define every business entity, aggregate, relationship, lifecycle, ownership, and business rule before designing the database.

Table of Contents
Domain Model Principles
Bounded Contexts
Core Business Domains
Aggregate Roots
Entity Catalog
Value Objects
Domain Relationships
Domain Events
State Machines
Ownership Matrix
Business Rules
Lifecycle Models
Identifier Strategy
Naming Standards
Multi-Store Readiness
Marketplace Readiness
Audit Model
Versioning Strategy
Domain Validation Rules
Future Domain Expansion
1. Domain Model Principles

Every business concept belongs to exactly one owning domain.

Rules:

One source of truth
No duplicated ownership
Explicit relationships
Immutable business events
Rich domain model
Persistence-independent business logic
2. Bounded Contexts
Identity
Customer
Catalog
Inventory
Pricing
Promotion
Cart
Checkout
Order
Payment
Shipping
Review
CMS
Marketing
Analytics
Notification
Administration
Platform

Each bounded context has:

Its own API
Its own entities
Its own events
Its own repositories
Its own services
3. Aggregate Roots

These are the primary business aggregates.

Customer
Product
Category
Collection
Cart
Order
Payment
Shipment
Warehouse
Review
Coupon
Campaign
ContentPage
Notification

Everything else belongs to one of these aggregates.

4. Entity Catalog
Identity Domain

Entities:

User
UserSession
OTPChallenge
OAuthAccount
RefreshToken
Role
Permission
PermissionGroup
Customer Domain

Entities:

Customer
Address
SavedPreference
Wishlist
RecentlyViewed
LoyaltyAccount
CustomerSegment
Catalog Domain

Entities:

Product
ProductVariant
ProductOption
ProductAttribute
ProductMedia
ProductSEO
ProductSpecification
ProductBadge
ProductTag
ProductBundle
Category Domain

Entities:

Category
CategorySEO
CategoryBanner
Collection Domain

Entities:

Collection
CollectionRule
CollectionBanner
Pricing Domain

Entities:

PriceList
ProductPrice
RegionalPrice
TaxRule
DiscountRule
Inventory Domain

Entities:

Warehouse
StockItem
ReservedStock
StockMovement
Supplier
PurchaseOrder
Cart Domain

Entities:

Cart
CartItem
AppliedCoupon
ShippingEstimate
Checkout Domain

Entities:

CheckoutSession
ShippingSelection
PaymentSelection
Order Domain

Entities:

Order
OrderItem
OrderStatusHistory
Invoice
Refund
ExchangeRequest
ReturnRequest
Payment Domain

Entities:

Payment
PaymentAttempt
PaymentMethod
PaymentWebhook
Settlement
Shipping Domain

Entities:

Shipment
ShipmentItem
TrackingEvent
Courier
DeliveryZone
Review Domain

Entities:

Review
ReviewReply
ReviewMedia
ReviewVote
CMS Domain

Entities:

Page
Banner
HeroSection
FAQ
Blog
BlogCategory
BlogTag
NavigationMenu
Marketing Domain

Entities:

Campaign
Coupon
ReferralProgram
GiftCard
LoyaltyRule
Notification Domain

Entities:

Notification
Template
DeliveryLog
SubscriptionPreference
Analytics Domain

Entities:

Event
Funnel
Dashboard
Report
5. Value Objects

Examples:

Money
Email
PhoneNumber
Address
GeoLocation
Dimensions
Weight
Currency
Percentage
DateRange
Slug
SKU
TaxRate
ColorCode
Size

These should be immutable and reusable.

6. Domain Relationships
Customer
   │
   ├── Addresses
   ├── Orders
   ├── Wishlist
   └── Reviews

Product
   │
   ├── Variants
   ├── Media
   ├── Inventory
   ├── Reviews
   ├── SEO
   └── Pricing

Order
   │
   ├── Items
   ├── Payment
   ├── Shipment
   └── Invoice

Avoid direct cross-domain database joins; communicate through application services and domain events.

7. Domain Events

Standardized event names:

CustomerRegistered
CustomerLoggedIn
ProductCreated
ProductPublished
ProductPriceChanged
InventoryReserved
InventoryReleased
CartCreated
CartItemAdded
CartAbandoned
CheckoutStarted
OrderPlaced
PaymentAuthorized
PaymentCaptured
PaymentFailed
ShipmentCreated
ShipmentDelivered
ReviewSubmitted
CouponApplied
CampaignStarted

Events are immutable and versioned.

8. State Machines
Product
Draft
   │
Review
   │
Published
   │
Archived
Order
Created
│
Payment Pending
│
Paid
│
Packed
│
Shipped
│
Delivered
│
Completed

Alternate states:

Cancelled
Returned
Exchanged
Refunded
Failed
Payment
Initiated
│
Authorized
│
Captured
│
Settled

Failures:

Failed
Expired
Refunded
Disputed
Shipment
Created
│
Packed
│
Picked
│
In Transit
│
Out for Delivery
│
Delivered
9. Ownership Matrix
Domain	Owns
Catalog	Products, Variants, Attributes
Inventory	Stock, Warehouses
Pricing	Prices, Taxes
Promotion	Coupons, Offers
Order	Orders, Returns
Payment	Transactions
Shipping	Shipments
CMS	Content
Marketing	Campaigns
Identity	Authentication
Customer	Profiles

Each entity has exactly one owning domain.

10. Business Rules

Examples:

A product cannot be published without at least one image.
A published product must have an active price.
A product variant must have a unique SKU.
Inventory cannot go below zero.
Coupons cannot be combined unless explicitly configured.
Reviews require a delivered order (verified purchase).
Refunds cannot exceed the captured payment amount.
Slugs must be unique within their entity type.

These rules belong in the domain layer, not controllers.

11. Lifecycle Models

Document lifecycle diagrams for:

Product
Variant
Collection
Coupon
Customer
Cart
Checkout
Order
Payment
Shipment
Return
Exchange
Review
Blog

Every lifecycle includes valid transitions and terminal states.

12. Identifier Strategy

Use immutable identifiers.

Examples:

Product ID (UUID/ULID)
Order Number (human-readable sequence)
SKU
Customer ID
Payment Reference
Shipment Number

Never expose database primary keys externally.

13. Naming Standards

Consistent conventions:

Domain events: OrderPlaced
Commands: CreateOrder
Queries: GetProductBySlug
Services: OrderApplicationService
Repositories: ProductRepository

Avoid ambiguous abbreviations.

14. Multi-Store Readiness

Prepare for future expansion:

Store entity
Store-specific pricing
Store-specific inventory
Store-specific CMS content
Store-specific promotions

Even if only one storefront launches initially.

15. Marketplace Readiness

Future entities:

Seller
SellerCatalog
SellerInventory
SellerSettlement
SellerCommission

Keep these out of the MVP but reserve the domain boundaries.

16. Audit Model

Every aggregate should support:

Created by
Updated by
Version
Timestamp
Soft delete (where appropriate)
Change history

Critical business actions should also produce immutable audit events.

17. Versioning Strategy

Version:

APIs
Domain events
Business rules (where configurable)
Templates
CMS content
Promotion rules

This allows evolution without breaking consumers.

18. Domain Validation Checklist

Before implementation, verify:

Every entity has one owner.
Every aggregate has a clear root.
Every state transition is valid.
Every event has a consumer (or is intentionally informational).
No circular dependencies between domains.
Business rules are documented and testable.
19. Future Domain Expansion

Reserved domains:

AI Recommendation
AI Search
Personalization
Loyalty Wallet
Subscription Commerce
Print-on-Demand
Affiliate Management
Franchise Operations
Marketplace
B2B Commerce

The existing domain model should accommodate these without major restructuring.

Deliverables of Volume 8

By the end of this volume, the team has:

A complete business domain model
Bounded contexts
Aggregate definitions
Entity catalog
Value object library
Domain relationships
State machines
Business rule catalog
Ownership matrix
Domain event vocabulary

This document becomes the business language shared by engineering, product, QA, analytics, and operations.