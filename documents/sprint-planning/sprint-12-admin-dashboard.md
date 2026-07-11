# Sprint 12 - Admin Dashboard

Theme: Reports, customer management, audit logs  
Primary source volumes: Volume 5, Volume 6, Volume 8, Volume 9, Volume 10, Volume 11, Volume 12  
Status: Not Started

## Sprint Goal

Turn the admin portal into an operations control center with dashboards, reports, customer management, audit logs, feature flags, platform settings, saved views, exports, and role-specific workflows.

## Business Outcome

Business, operations, support, finance, catalog, marketing, and leadership users can monitor platform health, manage customers, review audit trails, and operate daily workflows from a SaaS-quality admin experience.

## Scope

- Admin dashboard with revenue, orders, AOV, conversion, cart abandonment, return rate, refund rate, active users, inventory alerts, failed payments, and search no-results alerts.
- Customer management with profile, addresses, order history, returns, reviews, loyalty, support notes, marketing preferences, and activity timeline.
- Audit logs with filters, before/after values, correlation IDs, actor, action, timestamp, IP, and export.
- Feature flags and platform settings.
- Reports shell for sales, inventory, taxes, customer retention, product performance, category performance, search, coupons, and campaigns.

## Deliverables

### Frontend

- Admin dashboard layout with KPI cards, charts, alerts, activity feed, and role-aware widgets.
- Customer list/detail screens with timeline and support actions.
- Audit log viewer with filters, detail drawer, export action, and correlation search.
- Feature flag and platform settings screens.
- Storybook stories for KPI card, dashboard chart, alert card, customer timeline, audit table, feature flag row, settings form, and report card.

### Backend

- Admin application services for dashboard aggregates, customers, audit logs, feature flags, settings, exports, and reports.
- Customer support actions with permission checks and audit.
- Report generation jobs for long-running exports.
- Structured admin activity logging across all admin actions.

### Database

- Platform tables for audit logs, feature flags, settings, scheduled jobs, exports, and report metadata.
- Customer activity read model and dashboard aggregate tables if needed.
- Indexes for audit actor, action, entity, timestamp, correlation ID, customer, feature flag, and report status.
- Seed admin dashboard defaults, feature flags, settings, and saved report definitions.

### API

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/customers`
- `GET /api/v1/admin/customers/{id}`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/reports`
- `POST /api/v1/admin/reports/{id}/export`
- `GET /api/v1/admin/feature-flags`
- `PATCH /api/v1/admin/settings`
- OpenAPI docs for admin dashboard, audit logs, settings, exports, and reports.

### DevOps

- Environment variables for export storage, report retention, dashboard cache TTL, audit retention, and feature-flag cache TTL.
- Worker jobs for report generation and audit retention archival.
- Monitoring for admin export failures and dashboard aggregate lag.

### QA

- Unit tests for dashboard aggregate mappers, customer permissions, audit filters, feature flag evaluation, settings validation, and export job creation.
- Integration tests for dashboard API, customer detail, audit log query, feature flag update, settings update, and report export.
- E2E tests for dashboard widgets, customer lookup, audit investigation, feature flag toggle, and report export.
- Accessibility checks for data tables, charts, keyboard shortcuts, focus order, and filter forms.
- Performance review for dashboard aggregates and audit-log filtering.

### Documentation

- Admin operations guide.
- Audit log dictionary.
- Feature flag governance.
- Report catalog.
- Sprint summary and admin security review.

## Acceptance Criteria

- Admin dashboard surfaces actionable operational KPIs.
- Customer management actions are permission-protected and audited.
- Audit logs are searchable and exportable.
- Feature flags are environment-aware and cached safely.
- Reports support long-running export jobs without blocking requests.

## Dependencies

- Prior domain sprints for data sources.
- Sprint 14 will deepen analytics dashboards and event funnels.

## Risks

- Dashboard numbers can be misleading without clear definitions.
- Customer support actions require strict audit and privacy controls.
- Audit retention must balance performance, compliance, and storage cost.
