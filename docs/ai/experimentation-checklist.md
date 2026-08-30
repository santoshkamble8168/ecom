# Experimentation checklist (Sprint 16)

AI and semantic features are **flags**, not experiments with a stats
engine. Use this list before turning anything on in production.

- [ ] `recommendations.ai` stays off until a provider adapter exists and
      a fallback rate dashboard is reviewed.
- [ ] `search.semantic` stays off until keyword vs semantic is compared
      on a labeled query set; keyword/facet search remains default.
- [ ] Slot strategy changes are merchandising, not A/B: change one slot,
      watch `recommendation_click` vs `recommendation_view` in analytics
      for a week.
- [ ] Fallback product slugs must be published catalog products.
- [ ] Do not put PII in recommendation event properties.
- [ ] Checkout, cart, and search still succeed with all AI flags off.
