# E2E Testing

## Purpose
Guidance for maintaining reusable e2e test assets.

## Responsibilities
- Define test scope and ownership.
- Keep fixtures deterministic.
- Document how tests are run locally and in CI.

## Best Practices
- Name tests by behavior.
- Avoid real external services unless explicitly configured.
- Use factories and fixtures.
- Assert user-visible and contract-level behavior.

## Checklist
- [ ] Happy path covered.
- [ ] Edge cases covered.
- [ ] Failure path covered.
- [ ] Fixtures documented.
- [ ] Coverage expectations met.

## Examples
- Unit: validate pure domain rules; Integration: validate API and persistence contracts; E2E: validate user journeys.

## Common Mistakes
- Brittle timing assumptions.
- Shared mutable fixture state.
- Testing implementation details instead of behavior.

## References
- docs/testing-strategy.md
- .ai/checklists/testing.md
