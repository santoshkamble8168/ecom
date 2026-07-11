Enterprise Commerce Platform Blueprint
Volume 9
Enterprise Database Architecture & Physical Data Model

Version: 1.0

Primary Database: PostgreSQL 17+

Supporting Data Stores:

Redis (Cache & Sessions)
Meilisearch (Search)
MinIO (Object Storage)
Table of Contents
Part I — Database Philosophy
Database Design Principles
Data Ownership
Storage Strategy
Naming Conventions
Primary Key Strategy
Soft Delete Policy
Audit Strategy
Time Management
Part II — Database Architecture
Database Layout
Schema Organization
Referential Integrity
Transaction Strategy
Concurrency & Locking
Part III — Physical Data Model
Identity Schema
Customer Schema
Catalog Schema
Inventory Schema
Pricing Schema
Promotions Schema
Cart Schema
Checkout Schema
Orders Schema
Payments Schema
Shipping Schema
Reviews Schema
CMS Schema
Marketing Schema
Analytics Schema
Notification Schema
Platform Schema
Part IV — Enterprise Topics
Indexing Strategy
Partitioning Strategy
Read Models
Search Synchronization
Backup Strategy
Disaster Recovery
Data Retention
Security
Multi-Tenant Readiness
Future Evolution
1. Database Design Principles

The database should be:

Normalized (3NF) for transactional integrity
Event-aware
Highly indexed
ACID-compliant
Versioned where required
Easy to migrate
Horizontally extensible

The database is the system of record, not the search engine or cache.

2. Storage Strategy
Data Type	Storage
Transactional data	PostgreSQL
Sessions	Redis
Product search	Meilisearch
Images & videos	MinIO
Logs	Loki
Metrics	Prometheus

Never store binary media in PostgreSQL.

3. Database Organization
commerce

├── identity
├── customer
├── catalog
├── inventory
├── pricing
├── promotion
├── cart
├── checkout
├── order
├── payment
├── shipping
├── review
├── cms
├── marketing
├── analytics
├── notification
├── platform

Each domain maps to a dedicated PostgreSQL schema.

4. Primary Key Strategy

Every table uses an immutable identifier.

Recommended:

ULID for globally unique, sortable IDs
Human-readable business numbers for external communication

Examples:

Entity	Internal ID	Public Identifier
Product	ULID	Slug
Customer	ULID	Customer Code
Order	ULID	ORD-2026-000001
Shipment	ULID	SHP-2026-000001
Invoice	ULID	INV-2026-000001

Never expose database sequence IDs.

5. Standard Columns

Every table should include:

id
created_at
updated_at
created_by
updated_by
version
deleted_at

Optional:

tenant_id
store_id
6. Identity Schema

Core tables:

users
roles
permissions
role_permissions
user_roles
sessions
refresh_tokens
oauth_accounts
otp_challenges

Indexes:

email
mobile
session_token
refresh_token
7. Customer Schema

Tables:

customers
customer_addresses
customer_preferences
wishlists
wishlist_items
recently_viewed
loyalty_accounts
customer_segments

Relationships:

Customer
 ├── Addresses
 ├── Wishlist
 ├── Orders
 ├── Reviews
 └── Loyalty
8. Catalog Schema

This is the largest transactional schema.

Tables:

products
product_variants
product_images
product_videos
product_attributes
product_attribute_values
product_options
categories
category_closure
collections
collection_rules
tags
product_tags
product_collections
seo_metadata

Important design choices:

Variants stored separately
Unlimited media
Attribute-driven variants
Category hierarchy via closure table
9. Inventory Schema

Tables:

warehouses
stock_items
stock_movements
reserved_inventory
purchase_orders
suppliers

Inventory must support:

Multi-warehouse
Reservation
Transfers
Auditing
10. Pricing Schema

Tables:

price_lists
product_prices
taxes
regional_prices
price_history

Support:

Scheduled pricing
Regional pricing
Future price activation
11. Promotion Schema

Tables:

coupons
coupon_rules
coupon_usage
campaigns
campaign_products
campaign_collections

Rules stored as configuration rather than code.

12. Cart Schema

Tables:

carts
cart_items
applied_discounts
saved_carts

Support:

Guest carts
Customer carts
Cart recovery
Expiration
13. Checkout Schema

Tables:

checkout_sessions
shipping_selection
payment_selection

Short-lived transactional data.

14. Order Schema

Tables:

orders
order_items
order_status_history
invoices
refunds
exchanges
returns

Relationships:

Order
 ├── Items
 ├── Payment
 ├── Shipment
 ├── Invoice
 ├── Refund
 └── Return

Never update order history destructively.

15. Payment Schema

Tables:

payments
payment_attempts
payment_webhooks
settlements

Store:

Provider response
Signature validation
Retry history
16. Shipping Schema

Tables:

shipments
shipment_items
tracking_events
couriers
delivery_zones

Shipment timeline stored separately.

17. Reviews Schema

Tables:

reviews
review_media
review_votes
review_replies

Support:

Images
Videos
Verified purchase
Moderation
18. CMS Schema

Tables:

pages
page_sections
banners
blogs
blog_categories
menus
navigation_items

Support draft, scheduled publish, and version history.

19. Marketing Schema

Tables:

campaigns
referrals
gift_cards
loyalty_rules
customer_campaigns
20. Analytics Schema

Avoid storing raw clickstream events in PostgreSQL indefinitely.

Use PostgreSQL for:

dashboards
reports
aggregates

Raw events should be archived to a data lake or warehouse in the future.

21. Notification Schema

Tables:

notification_templates
notification_queue
delivery_logs

Queue processing handled by BullMQ.

22. Platform Schema

Tables:

audit_logs
feature_flags
settings
scheduled_jobs
migrations
23. Indexing Strategy

Every table should have:

Primary key index
Foreign key indexes
Search indexes
Unique constraints where required

Examples:

Products:

slug
sku
category_id
collection_id
status

Orders:

customer_id
order_number
created_at
status

Composite indexes should match common query patterns.

24. Partitioning Strategy

Partition large tables by date.

Examples:

audit_logs
analytics_events
notification_logs
payment_webhooks

Benefits:

Faster queries
Easier archival
Lower maintenance costs
25. Read Models

Separate transactional writes from optimized reads.

Examples:

Homepage products
Trending products
Best sellers
Category summaries

These can be refreshed asynchronously.

26. Search Synchronization

Flow:

Product Updated
        │
Domain Event
        │
Background Job
        │
Meilisearch Index

Never query PostgreSQL directly for full-text product search.

27. Backup Strategy

Recommended:

Nightly full backups
Hourly WAL archiving
Point-in-time recovery (PITR)
Encrypted backups
Off-site storage

Regularly test restoration procedures.

28. Disaster Recovery

Define:

Recovery Time Objective (RTO)
Recovery Point Objective (RPO)
Failover procedure
Database health checks
Replication monitoring
29. Security
Row-level security where appropriate
Encryption at rest
TLS in transit
Least-privilege database roles
Secrets managed outside the database
Immutable audit logs
30. Multi-Store & Multi-Tenant Readiness

Every business table should be designed to optionally reference:

store_id
brand_id
tenant_id (future)

This allows:

Multiple storefronts
Multiple brands
International expansion

without redesigning the schema.

31. Migration Strategy

Use Prisma Migrate with strict controls:

Forward-only migrations
Reviewed pull requests
Automated migration tests
Seed scripts
Rollback playbooks for production
32. Data Quality Rules

Enforce through constraints where possible:

Unique SKU
Unique slug
Non-negative inventory
Valid price ranges
Referential integrity
Immutable completed orders

Business validation belongs in the domain layer; structural validation belongs in the database.

33. Performance Targets
Product lookup: < 50 ms
Cart operations: < 100 ms
Checkout transaction: < 300 ms (excluding payment gateway)
Search synchronization: < 5 seconds
Dashboard queries: < 500 ms using precomputed aggregates
Deliverables of Volume 9

By the end of this volume, the engineering team will have:

Enterprise PostgreSQL architecture
Domain-based schema organization
Complete physical data model
Indexing standards
Partitioning strategy
Backup and recovery plan
Migration standards
Security baseline
Multi-store readiness
Database governance rules

This becomes the authoritative database architecture for the platform.

Chief Architect Review

Before implementation begins, I would add one more foundational document that many teams underestimate:

Volume 9A — Canonical Database Dictionary

It should define every table and every column in the platform, including:

Column name
Data type
Nullability
Default value
Constraints
Indexes
Business description
Owning domain
API exposure
Search indexing status
Audit requirements