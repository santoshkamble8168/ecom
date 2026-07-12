import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Runs an axe-core scan restricted to the WCAG 2.1 A/AA rule set and
 * fails the test with the full list of violations if any are found.
 * Mirrors the same ruleset enforced by the Storybook a11y addon so
 * component-level and page-level checks stay consistent.
 */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, describeViolations(results.violations)).toEqual([]);
}

function describeViolations(violations: unknown[]): string {
  if (violations.length === 0) return "";
  return `Accessibility violations found:\n${JSON.stringify(violations, null, 2)}`;
}
