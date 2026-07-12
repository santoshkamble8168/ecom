import type { Meta, StoryObj } from "@storybook/react";

import { breakpoints, colors, radius, spacing, typography } from "./tokens";

function ColorSwatchGroup({ name, shades }: { name: string; shades: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold capitalize text-neutral-700">{name}</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(shades).map(([shade, value]) => (
          <div key={shade} className="flex flex-col items-center gap-1">
            <div
              className="h-12 w-12 rounded-md border border-neutral-200"
              style={{ backgroundColor: value }}
              title={value}
            />
            <span className="text-xs text-neutral-500">{shade}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Foundations() {
  return (
    <div className="flex flex-col gap-10 p-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Colors</h2>
        <div className="flex flex-col gap-6">
          {Object.entries(colors).map(([name, shades]) => (
            <ColorSwatchGroup key={name} name={name} shades={shades as Record<string, string>} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Spacing</h2>
        <div className="flex flex-wrap items-end gap-3">
          {Object.entries(spacing).map(([key, value]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div className="bg-brand-500" style={{ width: value, height: value }} />
              <span className="text-xs text-neutral-500">
                {key} ({value})
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Radius</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(radius).map(([key, value]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div
                className="h-12 w-12 border-2 border-brand-500 bg-brand-50"
                style={{ borderRadius: value }}
              />
              <span className="text-xs text-neutral-500">
                {key} ({value})
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Typography</h2>
        <div className="flex flex-col gap-2">
          {Object.entries(typography.fontSize).map(([key, value]) => (
            <p key={key} style={{ fontSize: value }}>
              {key} ({value}) — The quick brown fox jumps over the lazy dog
            </p>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Breakpoints</h2>
        <ul className="flex flex-col gap-1 text-sm text-neutral-700">
          {Object.entries(breakpoints).map(([key, value]) => (
            <li key={key}>
              {key}: {value}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const meta: Meta<typeof Foundations> = {
  title: "Foundations/Design Tokens",
  component: Foundations,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Foundations>;

export const AllTokens: Story = {};
