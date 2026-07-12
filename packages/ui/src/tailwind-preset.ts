import type { Config } from "tailwindcss";

import { breakpoints, colors, radius, spacing, typography, zIndex } from "./tokens";

/**
 * Shared Tailwind preset consumed by every app (`storefront`, `admin`).
 * App-level `tailwind.config.ts` files extend this preset instead of
 * redefining tokens, so design changes propagate from one place.
 */
export const uiTailwindPreset: Partial<Config> = {
  darkMode: "class",
  theme: {
    screens: breakpoints,
    extend: {
      colors,
      spacing,
      borderRadius: radius,
      fontFamily: {
        sans: [...typography.fontFamily.sans],
        display: [...typography.fontFamily.display],
      },
      fontSize: typography.fontSize,
      zIndex: Object.fromEntries(Object.entries(zIndex).map(([k, v]) => [k, String(v)])),
    },
  },
};

export default uiTailwindPreset;
