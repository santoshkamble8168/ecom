/**
 * Design tokens shared by the Tailwind preset and any runtime code
 * that needs token values (charts, canvas drawing, email templates).
 * Source of truth for color, spacing, radius, typography, motion,
 * breakpoints, and z-index. Update here first, Tailwind preset reads
 * from these values.
 *
 * Storefront theme follows Flipkart-style functional colors:
 * cool-gray page canvas, white surfaces, black type,
 * yellow primary CTAs (black on yellow), royal blue for brand/links/login,
 * green for savings. Danger red is reserved for errors/badges only.
 */
export const colors = {
  // Brand / trust blue (links, Login, search focus, secondary brand actions).
  // 600–700 are tuned so white text meets WCAG AA on filled buttons.
  brand: {
    50: "#eef5ff",
    100: "#d9e8ff",
    200: "#bcd6ff",
    300: "#8ebcff",
    400: "#5996ff",
    500: "#2874f0",
    600: "#1a66d8",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  // Primary conversion CTAs (Buy Now, Place Order, Add to Bag).
  // #FFE500 + near-black text clears WCAG AAA (~15:1).
  accent: {
    50: "#fffceb",
    100: "#fff8c4",
    200: "#fff085",
    300: "#ffe44d",
    400: "#ffd81f",
    500: "#ffe500",
    600: "#f5c400",
    700: "#d9a800",
    800: "#b38600",
    900: "#8f6a00",
  },
  neutral: {
    0: "#ffffff",
    50: "#f1f3f6",
    100: "#e7e9ee",
    200: "#d4d7de",
    300: "#c0c4cc",
    400: "#9ea3ae",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  // Discount / savings / success
  success: { 50: "#e8f5e9", 100: "#c8e6c9", 500: "#2e7d32", 600: "#1b873f", 700: "#15803d" },
  warning: { 50: "#fffbeb", 100: "#fef3c7", 500: "#f59e0b", 600: "#d97706" },
  danger: { 50: "#fef2f2", 100: "#fee2e2", 500: "#ef4444", 600: "#dc2626" },
  // Interactive text links (same family as brand blue)
  info: { 50: "#eef5ff", 100: "#d9e8ff", 500: "#2874f0", 600: "#1a66d8" },
} as const;

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export const radius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const typography = {
  fontFamily: {
    sans: ["Inter", "system-ui", "sans-serif"],
    display: ["Sora", "system-ui", "sans-serif"],
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
    "5xl": "48px",
  },
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

export const motion = {
  duration: { fast: "120ms", base: "200ms", slow: "320ms" },
  easing: { standard: "cubic-bezier(0.4, 0, 0.2, 1)" },
} as const;
