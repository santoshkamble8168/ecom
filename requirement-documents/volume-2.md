Most developers jump directly into coding pages, but companies like Apple, Airbnb, Shopify, Amazon, Stripe, Nike, and even Bewakoof first build a Design Language.

A good design system can reduce development effort by 40–60% while ensuring consistency.

I would also make one important change to our blueprint.

We are not designing pages.

We are designing a Commerce Design System (CDS).

Every page in the storefront and admin will be assembled from reusable components.

Enterprise Commerce Platform
Volume 2
Enterprise Design System (Commerce Design System)

Version: 1.0

Table of Contents
Part 1 — Design Philosophy
Design Principles
UX Principles
Design Language
Brand Personality
Accessibility Standards
Motion Principles
Part 2 — Visual Language
Color System
Typography
Icons
Elevation
Shadows
Border Radius
Spacing
Grid System
Breakpoints
Part 3 — Component Library

More than 120 reusable components.

Part 4 — Commerce Components

Product Cards

Filters

Cart

Checkout

Reviews

Search

Wishlist

etc.

Part 5 — Patterns

Search

Checkout

Forms

Navigation

Filtering

Pagination

Empty States

Loading

Errors

Part 6 — Responsive Guidelines

Desktop

Tablet

Mobile

1. Design Philosophy

The design philosophy is inspired by the strengths of Bewakoof's shopping experience, but it establishes an original design language rather than copying another brand.

Every screen should optimize for:

Product discovery
Purchase confidence
Purchase speed
Trust
Performance
Accessibility

Every design decision should support at least one business KPI such as conversion rate, average order value, or customer retention.

2. UX Principles
Rule 1

Never make users think.

Rule 2

Products should always be visible.

Rule 3

The shortest path to purchase wins.

Rule 4

One primary action per screen.

Rule 5

Reduce cognitive load.

Rule 6

Scrolling is acceptable.

Clicking unnecessarily is not.

Rule 7

Show information progressively.

Avoid overwhelming users.

3. Design Principles
Mobile First

Design every screen for mobile before desktop.

Performance First

Avoid heavy animations.

Prioritize responsiveness.

Accessibility First

Support:

Keyboard navigation
Screen readers
Focus indicators
Sufficient contrast
Reduced motion preferences

Target WCAG 2.2 AA compliance.

Conversion First

Every screen should answer:

Will this help the customer make a purchase?

4. Brand Personality

Desired attributes:

Modern
Premium
Playful
Clean
Youthful
Confident
Minimal
Trustworthy

Avoid:

Clutter
Excessive gradients
Overly rounded UI
Excessive shadows
5. Color System
Neutral Palette
Gray 50
Gray 100
Gray 200
Gray 300
Gray 400
Gray 500
Gray 600
Gray 700
Gray 800
Gray 900
Primary Brand
Black
White

This creates a timeless foundation.

Semantic Colors

Success

Warning

Error

Info

Product Badges

New

Trending

Limited Edition

Best Seller

Sale

Exclusive

Eco

Status Colors

In Stock

Low Stock

Out of Stock

Coming Soon

Preorder

6. Typography

Recommended Font

Inter

Alternative

Manrope

Reason

Excellent readability
Open source
Great multilingual support
Modern appearance
Typography Scale

Display XL

Display L

Heading XL

Heading L

Heading M

Heading S

Body L

Body M

Body S

Caption

Label

Button

7. Spacing System

Use an 8-point spacing system.

4
8
16
24
32
40
48
64
80
96
128

Never use arbitrary spacing.

8. Border Radius
0
4
8
12
16
24
Full
9. Shadows

Levels

xs
sm
md
lg
xl

Use shadows sparingly.

10. Grid System

Desktop

12 columns

Tablet

8 columns

Mobile

4 columns

11. Breakpoints
Mobile

0-639

Tablet

640-1023

Desktop

1024-1439

Large

1440+
12. Icon Library

Use:

Lucide React

Avoid mixing icon libraries.

13. Illustrations

Custom SVGs

Avoid stock illustrations.

14. Motion Design

Duration

150–300ms

Animations

Fade
Scale
Slide

Avoid unnecessary parallax effects.

15. Layout System

Storefront Layout

Announcement Bar

↓

Header

↓

Navigation

↓

Content

↓

Newsletter

↓

Footer

Admin Layout

Sidebar

↓

Topbar

↓

Workspace

↓

Inspector (optional)
16. Navigation

Desktop

Mega Menu
Sticky Header
Search
Cart
Wishlist
Profile

Mobile

Drawer Menu
Bottom Navigation (optional)
Sticky Cart
17. Component Library
Foundation
Container
Stack
Grid
Divider
Surface
Card
Sheet
Section
Inputs
Text Field
Password
OTP
Number
Textarea
Select
Multi Select
Date Picker
Toggle
Switch
Radio
Checkbox
Slider
Color Picker
File Upload
Image Upload
Buttons

Variants:

Primary
Secondary
Outline
Ghost
Link
Icon
Destructive

States:

Default
Hover
Focus
Active
Loading
Disabled
Feedback
Toast
Snackbar
Alert
Progress
Spinner
Skeleton
Empty State
Error State
Navigation
Tabs
Breadcrumb
Pagination
Sidebar
Mega Menu
Dropdown
Accordion
Overlay
Modal
Drawer
Bottom Sheet
Tooltip
Popover
18. Commerce Components

This is the heart of the design system.

Product Card

Must include:

Image
Hover Image
Wishlist
Product Name
Brand
Rating
Price
Discount
Size Quick View
Delivery Badge
Stock Badge

Variants:

Grid
List
Compact
Featured
Carousel
Product Gallery

Supports:

Zoom
Multiple Images
Video
360° (future)
Swipe
Thumbnail Navigation
Variant Selector

Supports:

Size
Color
Material
Fit
Price Component

Displays:

Current Price
Original Price
Savings
Percentage Off
Membership Price (future)
Rating Component

Displays:

Average Rating
Total Reviews
Distribution
Verified Purchases
Search Components
Search Bar
Search Suggestions
Trending Searches
Recent Searches
Search Filters
Search Results
No Results
Cart Components
Cart Item
Cart Summary
Coupon
Shipping Estimate
Recommended Products
Checkout Components
Address Card
Delivery Option
Payment Option
Price Breakdown
Order Summary
Order Components
Order Card
Shipment Tracker
Invoice Download
Return Status
Exchange Status
19. Admin Components
Data Table
Bulk Actions
Filters
Charts
KPI Cards
Timeline
Activity Feed
Audit Viewer
JSON Viewer
Image Manager
Product Editor
Rich Text Editor
20. Design Tokens

Centralize all visual values.

Examples:

Colors
Typography
Spacing
Radius
Shadows
Z-index
Animation durations

This ensures theming and future redesigns require minimal code changes.

21. Accessibility Checklist

Every component must support:

Keyboard navigation
Focus management
ARIA attributes
Screen readers
High contrast
Error announcements
Touch targets of at least 44×44 px
22. Responsive Strategy

Instead of separate mobile and desktop designs, components should adapt responsively.

Examples:

Product grid: 2 columns (mobile), 3–4 (tablet), 5–6 (desktop)
Filters: drawer on mobile, sidebar on desktop
Tables: cards on small screens where appropriate
23. UX Patterns

Standardize common interactions:

Search autocomplete
Infinite scroll vs. pagination
Sticky "Add to Cart"
Multi-step checkout
Form validation
Empty states
Skeleton loading
Confirmation dialogs
24. Design System Governance

Every new UI component must include:

Purpose
Anatomy
States
Variants
Accessibility requirements
Responsive behavior
Usage examples
Do's and Don'ts

No page should introduce ad hoc styling or one-off components.

Deliverables of Volume 2

By the end of this volume, the team should have:

A complete visual language
A reusable component library
Responsive design guidelines
Accessibility standards
Commerce-specific UI patterns
Admin UI standards
Design tokens
Governance rules

This design system becomes the foundation for every screen in the storefront, admin portal, CMS, and future mobile applications.

Architecture review

If I were leading this project, I would add one more deliverable before designing individual pages:

Information Architecture (IA).

It will define:

Site map
Navigation hierarchy
URL strategy
Product taxonomy
Category taxonomy
Collection hierarchy
Breadcrumb rules
Internal linking strategy
SEO-friendly route conventions