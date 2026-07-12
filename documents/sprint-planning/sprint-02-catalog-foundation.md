# Sprint 2 - Catalog Foundation

Theme: Categories, products, variants, admin CRUD  
Primary source volumes: Volume 3, Volume 5, Volume 6, Volume 8, Volume 9, Volume 10, Volume 11  
Status: Done

## Sprint Goal

Build the catalog backbone for apparel commerce: data-driven categories, collections, attributes, products, variants, media metadata, SEO metadata, admin CRUD, validation, seed products, and publication workflows.

## Business Outcome

The business can create and manage T-shirt products, variants, categories, and collections without developer involvement, while keeping product data ready for storefront, search, SEO, inventory, pricing, and analytics.

## Scope

- Catalog domain for products, variants, attributes, options, tags, categories, collections, and media records.
- Category hierarchy using scalable tree/closure-table planning.
- Attribute-driven filters for size, color, fit, sleeve, neck, fabric, GSM, theme, collection, rating, availability, and discount.
- Admin product CRUD with draft, review, publish, archive states.
- Product validation: unique SKU, unique slug, required image before publish, active price before publish, valid variant matrix.
- Media upload contract planning with MinIO integration prepared for later image processing.

## Deliverables

### Frontend

- Admin catalog shell: product list, create/edit product, variant editor, category manager, collection manager, attribute manager, media selector shell.
- Storefront-facing reusable components planned: product card, price display, rating display, badge, variant selector, category tile, collection tile.
- Loading, empty, and error states for catalog admin pages.
- Storybook stories for product card, product admin form sections, category tree, attribute field, collection card, media tile, and status badge.

### Backend

- Catalog application services for product, variant, category, collection, attribute, tag, and SEO metadata management.
- Domain entities, value objects, repositories, policies, commands, queries, and events.
- Events: `ProductCreated`, `ProductPublished`, `ProductPriceChanged`, `CategoryUpdated`, `CollectionUpdated`.
- Admin authorization for catalog read/create/update/delete/publish/export permissions.
- Structured logging for catalog mutations and publication decisions.

### Database

- Prisma migrations for products, product variants, product options, product attributes, product media, categories, category closure, collections, collection rules, tags, product tags, product collections, and SEO metadata.
- Indexes for slug, SKU, status, category, collection, tags, publish status, and updated timestamps.
- Seed data for initial T-shirt taxonomy, sizes, colors, fits, themes, categories, collections, sample products, and admin roles.

### API

- `GET /api/v1/products`
- `GET /api/v1/products/{slug}`
- `GET /api/v1/categories`
- `GET /api/v1/collections`
- `GET /api/v1/attributes`
- Admin CRUD endpoints under `/api/v1/admin/products`, `/api/v1/admin/categories`, `/api/v1/admin/collections`, and `/api/v1/admin/attributes`.
- OpenAPI schemas for product, variant, category, collection, SEO metadata, media, validation errors, and publish response.

### DevOps

- MinIO bucket planning for `product-images`, `cms-assets`, `imports`, and `exports`.
- Environment variables for media storage, image constraints, catalog page size, and admin upload limits.
- CI migration validation and seed validation.

### QA

- Unit tests for product rules, SKU/slug value objects, category hierarchy rules, collection rules, and publish policy.
- Integration tests for product CRUD, variant CRUD, category tree, collection assignment, and authorization.
- E2E tests for admin product creation, category creation, collection assignment, and publish flow.
- Accessibility checks for admin forms, tables, tree views, and validation summaries.
- Performance review for product list query, admin filters, and category hierarchy queries.

### Documentation

- Catalog domain model docs.
- OpenAPI catalog docs.
- Admin product-management playbook.
- Database dictionary entries for catalog tables.
- Sprint summary and catalog security review.

## Acceptance Criteria

- Catalog data is domain-owned and not hardcoded in UI.
- Admins can create draft products with variants and publish only when business rules pass.
- Categories, attributes, filters, and collections are reusable and scalable.
- Product APIs return standard response envelopes and do not expose raw database IDs externally.
- Seed data supports Sprint 3, Sprint 4, and Sprint 5 storefront work.

## Dependencies

- Sprint 1 RBAC and admin identity.
- Pricing and inventory may be basic placeholders until Sprint 10, but catalog must reserve clean boundaries.

## Risks

- Poor product modeling will break filters, variants, SEO, and search later.
- Publishing products before pricing and inventory rules are finalized may create inconsistent storefront data.
