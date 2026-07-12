# Pages Playwright Guide

## Purpose
Reusable Playwright guidance for Page Object Model, fixtures, selectors, retries, screenshots, videos, traces, parallel execution, and accessibility checks.

## Responsibilities
- Keep E2E tests readable and resilient.
- Centralize page objects, fixtures, and utilities.
- Support debugging through screenshots, videos, traces, and clear failure messages.

## Best Practices
- Use role-based selectors and accessible names.
- Model pages by user behavior, not DOM structure.
- Keep tests independent and parallel-safe.
- Capture traces on retry and artifacts on failure.
- Include accessibility checks for critical journeys.

## Checklist
- [ ] Page objects hide selector details.
- [ ] Fixtures create deterministic test state.
- [ ] Tests can run in parallel.
- [ ] Retries are configured only for flake diagnosis.
- [ ] Screenshots, videos, and traces are documented.
- [ ] Accessibility assertions cover critical flows.

## Examples
- CheckoutPage.addItemToCart() uses getByRole selectors and waits for user-visible state.
- Test fixtures create isolated users and clean data after execution.

## Common Mistakes
- Using CSS selectors tied to layout.
- Sharing state between tests.
- Using fixed sleeps instead of web-first assertions.
- Ignoring trace output during failures.

## References
- Playwright documentation
- WCAG 2.2
- docs/testing-strategy.md
