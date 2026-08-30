# Personalization privacy

Related: [ADR 0016](../decisions/0016-rule-based-recommendations.md)

## What is stored

`personalization_profiles` holds, per **logged-in user id**:

- `product_affinities`: `{ slug, score }` from recently viewed counts
- `category_affinities`: `{ slug, score }` from those products' categories

Guest sessions keep `recently_viewed` rows (existing Sprint 5) and are
**not** copied into profiles.

## What is not stored

Email, phone, payment instruments, addresses, search query text, and
raw analytics properties.

## Consent

Aggregation runs only when feature flag `personalization.profiles` is
on. Profiles are deleted after `PERSONALIZATION_RETENTION_DAYS`
(default 90) with no updates. Deleting a user cascades the profile.

## Explainability

Storefront rails show catalog products, not a model score. Admin slot
`reason` strings describe the rule (category, collection, newest,
co-purchase). `recommendations.ai` does not change ranking until a
provider exists.
