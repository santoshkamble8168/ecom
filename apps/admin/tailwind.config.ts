import { uiTailwindPreset } from "@ecom/ui/src/tailwind-preset";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [uiTailwindPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
