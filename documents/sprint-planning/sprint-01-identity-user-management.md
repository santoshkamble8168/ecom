# Sprint 1 - Identity & User Management

Theme: Login, OTP, Google Auth, profile, RBAC  
Primary source volumes: Volume 1, Volume 5, Volume 6, Volume 8, Volume 9, Volume 10  
Status: Done (functional — formal DoD deferred)

## Deferred — revisit at end of sprint program

These items are intentionally out of scope for now and should be completed before production:

- Google OAuth UI on storefront (API ready; needs `GOOGLE_CLIENT_ID` in `.env`)
- Mobile/SMS OTP UI flows
- Full RBAC role set (Finance, Operations, Analyst, Content Editor, Inventory Manager)
- Secure httpOnly cookies + CSRF strategy (currently localStorage JWT)
- Real email/SMS OTP delivery (Mailpit/SMTP integration)
- Admin forbidden/unauthorized screens and role-aware nav hiding
- React Hook Form + Zod on all auth forms
- E2E tests (customer OTP, profile, admin login, unauthorized routes)
- Accessibility audit on auth forms
- Storybook stories (OTP input, auth card, profile card, address card)
- OpenAPI auth/RBAC documentation
- Identity ADRs, RBAC permission matrix, sprint summary, security review
- Integration tests for auth endpoints and audit logs

## Sprint Goal

Implement the identity foundation for customers and administrators with conversion-friendly OTP login, Google OAuth, secure sessions, profile basics, address ownership, admin RBAC, audit logging, and authorization rules that later sprints can reuse.

## Business Outcome

Customers can authenticate with minimal friction, admins can operate through permission-controlled access, and every protected action has a secure, auditable identity context.

## Scope

- Customer email OTP, mobile OTP, Google OAuth, logout, refresh, and session recovery.
- Admin login with stricter policy, role assignment, permissions, and audit trail.
- Customer profile, preferences, and address book foundations.
- RBAC model for Super Admin, Catalog Manager, Inventory Manager, Marketing Manager, Customer Support, Finance, Operations, Content Editor, and Analyst.
- Rate limiting, OTP expiry, retry controls, token rotation, secure cookies, CSRF strategy, and suspicious login logging.

## Deliverables

### Frontend

- Storefront auth flows: login entry, OTP request, OTP verification, Google login, session loading, logout, and profile shell.
- Admin auth shell with role-aware navigation and unauthorized/forbidden screens.
- Accessible form states using React Hook Form and Zod: loading, validation, resend OTP, error, empty, and success states.
- Dark mode and responsive layouts for auth screens.
- Storybook stories for OTP input, auth card, profile card, address card, role badge, and permission state.

### Backend

- Identity domain implementation for users, sessions, OTP challenges, OAuth accounts, refresh tokens, roles, permissions, and user roles.
- Customer domain basics for profile, saved preferences, and addresses.
- Guards, decorators, permission checks, resource-level authorization hooks, and admin/customer identity separation.
- Structured logs for login attempts, token refresh, logout, OTP failures, and permission denials.

### Database

- Prisma schema and migrations for identity and customer basics.
- Indexes on email, mobile, session token, refresh token, role, permission, and customer code.
- Seed data for platform roles, baseline permissions, development admin, and feature flags.
- Audit requirements for login, role assignment, permission changes, profile updates, and address updates.

### API

- `POST /api/v1/auth/send-otp`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/me/addresses`
- `POST /api/v1/me/addresses`
- Admin user, role, and permission endpoints under `/api/v1/admin`.

### DevOps

- Environment variables for JWT, refresh token, OTP, OAuth, cookie, SMTP/SMS providers, and rate limits.
- Docker/Mailpit support for development OTP delivery.
- CI integration tests for auth endpoints and permission checks.
- Health checks include auth dependencies where appropriate.

### QA

- Unit tests for OTP policy, token service, role permission evaluator, address validation, and auth guards.
- Integration tests for login, refresh, logout, forbidden access, and audit logs.
- E2E tests for customer OTP login, profile update, admin login, and unauthorized admin route.
- Accessibility checks for auth forms, OTP field labels, focus management, and error announcements.
- Security tests for OTP brute force, expired OTP, refresh token reuse, CSRF-sensitive flows, and rate limits.

### Documentation

- OpenAPI auth and RBAC docs.
- Identity ADRs for OTP-first login, secure cookies, token rotation, and admin/customer separation.
- RBAC permission matrix.
- Sprint summary and security review.

## Acceptance Criteria

- Customers can authenticate without password login.
- Admin routes enforce server-side permissions.
- Refresh token rotation and revocation are planned and covered by tests.
- Profile and address operations are validated, authorized, logged, and documented.
- Login and permission changes are auditable.

## Dependencies

- Sprint 0 platform foundation.
- Email/SMS delivery provider choices may start as abstractions with development-only adapters.

## Risks

- OTP abuse can increase cost if rate limits are weak.
- RBAC shortcuts will become expensive to fix after admin modules are built.
- Social login must not bypass customer verification or audit rules.
