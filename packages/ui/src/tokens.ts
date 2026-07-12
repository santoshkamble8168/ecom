/**
 * Design tokens shared by the Tailwind preset and any runtime code
 * that needs token values (charts, canvas drawing, email templates).
 * Source of truth for color, spacing, radius, typography, motion,
 * breakpoints, and z-index. Update here first, Tailwind preset reads
 * from these values.
 */
export const colors = {
  brand: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
    800: "#9a3412",
    900: "#7c2d12",
  },
  neutral: {
    0: "#ffffff",
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  success: { 500: "#22c55e", 600: "#16a34a" },
  warning: { 500: "#f59e0b", 600: "#d97706" },
  danger: { 500: "#ef4444", 600: "#dc2626" },
  info: { 500: "#3b82f6", 600: "#2563eb" },
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
