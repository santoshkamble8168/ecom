# ADR 0008: Tailwind CSS + shadcn/ui-Style Component Architecture for `@ecom/ui`

- Status: Accepted
- Date: 2026-07-12
- Sprint: Sprint 0 — Project Foundation

## Context

Both `apps/storefront` and `apps/admin` need a consistent, accessible,
themeable (light/dark/system) design system with shared primitives
(buttons, cards, inputs, ...), commerce-specific components, and admin-
specific components, per the Sprint 0 frontend deliverables. The system
also needs design tokens (color, spacing, radius, typography, motion,
breakpoints, z-index) as a single source of truth, and a way to document
components (Storybook) with accessibility verification built in.

## Decision

Build `packages/ui` (`@ecom/ui`) using **Tailwind CSS** for styling and a
**shadcn/ui-style component architecture**: components are plain,
copy-ownable React + TypeScript source (not a compiled component
library with runtime CSS-in-JS), built with:

- `class-variance-authority` (`cva`) for variant/size APIs, e.g.
  `buttonVariants` in `packages/ui/src/components/button.tsx` defining
  `variant` (primary/secondary/outline/ghost/destructive) and `size`
  props as typed, autocompletable options.
- A shared `cn()` utility (`packages/ui/src/lib/cn.ts`, `clsx` +
  `tailwind-merge`) so consumers can override/extend classes safely
  without specificity fights.
- A centralized Tailwind preset (`packages/ui/src/tailwind-preset.ts`)
  and token source (`packages/ui/src/tokens.ts`) that both the UI
  package and each app's own `tailwind.config.ts` extend, so color,
  spacing, radius, and breakpoint values are defined exactly once.
- Storybook (`packages/ui/.storybook/`) with `@storybook/addon-a11y` for
  living documentation and automated accessibility checks on every
  component and the token reference page (`tokens.stories.tsx`).

Components are exported through `packages/ui/src/index.ts` and consumed
by both `apps/storefront` and `apps/admin` as `@ecom/ui` workspace
imports — one design system, two apps.

## Alternatives Considered

- **A traditional compiled component library (e.g. MUI, Ant Design,
  Chakra)** — rejected: these ship their own styling engine/runtime
  and opinionated component behavior that's harder to fully restyle to
  a custom brand, and pulls in more runtime weight than Tailwind's
  build-time-only CSS. The commerce UI needs pixel-level control
  (matching the reference screenshots in
  `requirement-documents/screenshots/`) that a heavier pre-styled
  library would fight against.
- **CSS Modules or vanilla CSS with BEM conventions** — rejected:
  loses Tailwind's utility-first velocity and the ecosystem tooling
  (IntelliSense, `tailwind-merge`, the a11y addon's ability to reason
  about computed styles) that this project standardizes on; would also
  need a separate design-token distribution mechanism instead of
  Tailwind's config-as-tokens approach.
- **CSS-in-JS (styled-components, Emotion)** — rejected: runtime style
  injection cost, and Next.js App Router's React Server Components have
  known friction with CSS-in-JS libraries that don't support them well;
  Tailwind's static, build-time CSS has no such conflict.
- **A component library published as pre-compiled JS (rather than
  copy-ownable source)** — rejected: the shadcn/ui pattern of owning
  the component source directly (even inside our own `packages/ui`)
  means we can patch behavior (like the WCAG contrast fixes made this
  sprint, see `docs/security/sprint-00-security-review.md` finding #2)
  without waiting on or forking an upstream package release.

## Consequences

- Positive: one token source (`tokens.ts` + `tailwind-preset.ts`) drives
  both apps' Tailwind configs, so a brand-color change is a one-file
  edit, not a hunt-and-replace across two codebases.
- Positive: `cva`-based variant APIs give type-safe, autocompletable
  props (`variant="primary"`, `size="sm"`) instead of consumers passing
  raw class strings.
- Positive: Storybook + `addon-a11y` catches accessibility regressions
  (like the contrast issues found and fixed this sprint) at the
  component level, before they reach either app.
- Negative: no runtime theming API (e.g. changing brand color without a
  rebuild) — acceptable since the brand isn't white-labeled or
  runtime-configurable per tenant.
- Negative: keeping two apps' Tailwind configs (`apps/storefront/tailwind.config.ts`,
  `apps/admin/tailwind.config.ts`) in sync with the shared preset requires
  discipline — mitigated by both extending `uiTailwindPreset` rather than
  redefining tokens locally.

## Revisit Triggers

- If the product ever needs runtime/tenant-configurable theming (e.g.
  white-labeling), revisit whether CSS variables driven by a theme
  provider (already partially planned for light/dark/system mode) need
  to expand into a full runtime theming API.
