import type { RecommendationSlotConfig } from "@ecom/types";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { RecommendationSlotRow } from "./recommendation-slot-row";

const sample: RecommendationSlotConfig = {
  slot: "homepage_trending",
  title: "Trending now",
  strategy: "trending",
  isEnabled: true,
  fallbackProductSlugs: ["classic-crew-neck-tee"],
  limit: 8,
};

const meta: Meta<typeof RecommendationSlotRow> = {
  title: "Admin/RecommendationSlotRow",
  component: RecommendationSlotRow,
  tags: ["autodocs"],
  args: {
    slot: sample,
    onChange: () => undefined,
    onSave: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof RecommendationSlotRow>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    slot: { ...sample, isEnabled: false },
  },
};

export const Interactive: Story = {
  render: function Interactive(args) {
    const [slot, setSlot] = React.useState(args.slot);
    return (
      <RecommendationSlotRow
        slot={slot}
        onChange={(patch) => setSlot((current) => ({ ...current, ...patch }))}
        onSave={() => undefined}
      />
    );
  },
};
