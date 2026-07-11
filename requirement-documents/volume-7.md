Enterprise Commerce Platform Blueprint
Volume 7
Frontend Architecture & Engineering Standards

Version: 1.0

Target Stack

Next.js 16+ (App Router)
React 19+
TypeScript
Tailwind CSS v4
shadcn/ui
TanStack Query
Zustand
React Hook Form
Zod
Framer Motion
React Aria (where appropriate)
Table of Contents
Frontend Vision
Architecture Principles
High-Level Frontend Architecture
Monorepo Structure
App Structure
Feature-Based Organization
UI Layer
State Management
API Layer
Authentication
Routing
Forms
Validation
Search Architecture
Caching Strategy
Performance
Error Handling
Internationalization
Accessibility
Testing
Analytics
Security
Coding Standards
Design System Integration
Engineering Checklist
1. Frontend Vision

The frontend should be:

Fast
SEO-friendly
Accessible
Reusable
Component-driven
Testable
Easy to extend
Mobile-first

Goals:

Lighthouse ≥ 95
Core Web Vitals pass
Zero duplicated business logic
Consistent UI through the design system
2. Architecture Principles
Feature-first organization
Atomic, reusable UI components
Business logic isolated from presentation
Server Components by default
Client Components only when required
Strong typing everywhere
Composition over inheritance
Configuration over hardcoding
3. High-Level Frontend Architecture
User
   │
Browser
   │
Next.js App Router
   │
────────────────────────────────────────────
│ Route Segment
│
├── Layout
├── Loading
├── Error
├── Page
├── Metadata
└── Server Actions (where appropriate)
────────────────────────────────────────────
            │
Feature Modules
            │
Shared Components
            │
API Client
            │
Backend REST API
4. Monorepo Structure
apps/
├── storefront/
├── admin/
├── api/
└── worker/

packages/
├── ui/
├── icons/
├── hooks/
├── utils/
├── config/
├── auth/
├── analytics/
├── types/
├── validation/
├── theme/
└── eslint/

Shared packages eliminate duplication between the storefront and admin applications.

5. Storefront Folder Structure
storefront/
│
├── app/
├── features/
├── components/
├── hooks/
├── services/
├── lib/
├── providers/
├── styles/
├── types/
├── constants/
├── config/
├── assets/
├── middleware.ts
└── instrumentation.ts
6. Feature Organization

Every business capability owns its code.

features/
│
├── auth/
├── catalog/
├── product/
├── cart/
├── checkout/
├── wishlist/
├── orders/
├── account/
├── reviews/
├── search/
├── cms/
└── marketing/

Each feature contains:

product/
│
├── components/
├── hooks/
├── services/
├── types/
├── schemas/
├── constants/
├── utils/
├── api/
└── tests/
7. Component Architecture

Three levels of components:

Design System Components

Reusable primitives.

Examples:

Button
Input
Card
Badge
Dialog
Tabs
Tooltip
Commerce Components

Business-specific reusable components.

Examples:

ProductCard
PriceDisplay
Rating
SizeSelector
QuantitySelector
CartSummary
CouponInput
Feature Components

Specific to one feature.

Examples:

ProductGallery
ReviewTimeline
OrderTracker
CheckoutStepper
8. State Management
Local State

React state.

Use for:

Modals
Inputs
Dropdowns
Server State

TanStack Query.

Use for:

Products
Categories
Orders
Customer profile

Features:

Automatic caching
Background refetch
Retry policies
Pagination support
Global Client State

Zustand.

Stores:

Cart count
Wishlist count
Theme
User preferences
Recently viewed
UI state

Avoid storing server data globally.

9. API Layer

Never call fetch() directly from UI components.

Architecture:

Page
   │
Hook
   │
Service
   │
API Client
   │
REST API

Example:

ProductPage
      │
useProduct()
      │
ProductService
      │
ApiClient

Centralize:

Headers
Authentication
Retry
Logging
Error mapping
10. Authentication

Support:

Email OTP
Mobile OTP
Google OAuth

Session handling:

Secure cookies
Silent refresh
Auto logout
Session recovery
11. Routing

Example:

/

/men

/women

/categories

/categories/t-shirts

/product/[slug]

/cart

/checkout

/account

/orders

/blog

Use route groups for authenticated sections.

12. Forms

Use:

React Hook Form
Zod

Capabilities:

Schema validation
Field-level validation
Async validation
Error summaries
Accessible labels
13. Search

Architecture:

SearchBar
      │
Autocomplete
      │
Search Service
      │
Backend Search API
      │
Meilisearch

Features:

Debouncing
Typo tolerance
Recent searches
Trending searches
Search suggestions
14. Performance Strategy

Optimize:

Images
Fonts
CSS
JavaScript

Techniques:

Server Components
Streaming
Suspense
Lazy loading
Dynamic imports
Route-level code splitting
Prefetching
Optimized image formats
15. Error Handling

Every route should include:

loading.tsx

error.tsx

not-found.tsx

Centralized error boundary:

Logs errors
Displays user-friendly messages
Supports retry
16. Internationalization

Future-ready.

Support:

Multiple languages
Multiple currencies
RTL layouts
Locale-aware formatting

Even if only English is launched initially, avoid hardcoded text.

17. Accessibility

Every component must support:

Keyboard navigation
Focus management
ARIA labels
Screen readers
Color contrast
Reduced motion
Semantic HTML
18. Testing Strategy
Unit Tests
Utility functions
Hooks
Services
Component Tests
Design system
Commerce components
Integration Tests
Product flow
Cart
Checkout
End-to-End Tests

Critical journeys:

Search
Add to Cart
Checkout
Payment
Order history

Recommended tools:

Vitest
React Testing Library
Playwright
19. Analytics

Every feature emits events.

Examples:

page_view

product_view

search

add_to_cart

wishlist_add

checkout_start

payment_success

order_complete

Analytics logic should live in a dedicated package rather than UI components.

20. Security
Content Security Policy (CSP)
Secure cookies
XSS protection
CSRF mitigation where applicable
Input sanitization
Rate limiting for sensitive actions
No secrets exposed to the client
21. Coding Standards
Strict TypeScript
ESLint
Prettier
Conventional Commits
Absolute imports
Named exports by default
Avoid deeply nested components
No business logic in presentational components
22. Design System Integration

Every screen must be composed from the shared component library.

Rules:

No inline styles
No duplicate components
Use design tokens
Support dark mode from day one
All spacing, colors, and typography come from the design system
23. Engineering Checklist

Every new feature must include:

UI implementation
Loading state
Empty state
Error state
Accessibility review
Responsive layout
Analytics events
Unit tests
Integration tests
Documentation
24. Frontend Performance Budget

Target metrics:

Metric	Target
Lighthouse Performance	≥ 95
Accessibility	100
Best Practices	100
SEO	100
LCP	< 2.5 s
INP	< 200 ms
CLS	< 0.1
Initial JS (per route)	< 150 KB (compressed target where practical)
25. Reusable UI Inventory

Before creating any new component, developers must check the shared library.

Core primitives:

Layout
Typography
Button
Input
Select
Dialog
Drawer
Tabs
Accordion
Table
Data Grid
Carousel
Pagination
Product Card
Price Display
Rating
Review Card
Cart Item
Address Card
Timeline
Empty State
Skeleton
Toast

No duplicate implementations should exist across the storefront and admin.

Deliverables of Volume 7

By the end of this volume, the frontend team has:

A scalable application architecture
Clear folder organization
Feature boundaries
Component hierarchy
State management strategy
API consumption pattern
Performance standards
Accessibility requirements
Testing strategy
Engineering standards

This becomes the frontend engineering handbook for the project.