import type { Config } from "tailwindcss";

import { uiTailwindPreset } from "./src/tailwind-preset";

const config: Config = {
  presets: [uiTailwindPreset],
  content: ["./src/**/*.{ts,tsx}", "./.storybook/**/*.{ts,tsx}"],
};

export default config;
