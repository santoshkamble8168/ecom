# Production launch checklist

Sprint: 17 (in progress)
Related: [ADR 0017](../decisions/0017-health-first-observability.md)

## Go / no-go

- [ ] All critical journeys pass (auth, PLP, PDP, cart, checkout, payment webhook, order, return, CMS, admin, notifications, analytics, SEO, recommendations with AI flags **off**).
- [ ] `GET /health/live` and `GET /health/ready` are the kube/load-balancer probes (ready requires Postgres + Redis).
- [ ] Secrets are not in git; production `JWT_*`, `DATABASE_URL`, Razorpay, SMTP, Meilisearch, MinIO keys rotated from `.env.example` defaults.
- [ ] `pnpm audit --audit-level=critical` is clean (CI `security-scan` job).
- [ ] Prisma migrations applied with a documented rollback (`prisma migrate resolve` / restore from backup).
- [ ] Feature flags: `recommendations.ai` and `search.semantic` remain **off** until a provider exists.
- [ ] Core Web Vitals and API p95 budgets from `docs/performance/budget.md` reviewed on a staging URL.
- [ ] Backup restore tested once on a copy of production-shaped data.

## Day-0 operations

- [ ] Who is on-call; how to reach them.
- [ ] Payment incident playbook: `docs/runbooks/payment-incident-runbook.md`
- [ ] Delivery failure: `docs/runbooks/delivery-failure-runbook.md`
- [ ] Queue / notification DLQ: `docs/runbooks/` (Sprint 13)
