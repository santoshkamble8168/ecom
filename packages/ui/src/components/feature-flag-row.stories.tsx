import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { FeatureFlagRow, type FeatureFlagRowFlag } from "./feature-flag-row";

const sampleFlag: FeatureFlagRowFlag = {
  key: "checkout.express_pay",
  isEnabled: true,
  description: "Show express payment wallets on checkout.",
  environment: "production",
  rolloutPercent: 25,
};

const meta: Meta<typeof FeatureFlagRow> = {
  title: "Admin/FeatureFlagRow",
  component: FeatureFlagRow,
  tags: ["autodocs"],
  args: {
    flag: sampleFlag,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FeatureFlagRow>;

export const Enabled: Story = {
  args: {
    onToggle: () => undefined,
  },
};

export const Disabled: Story = {
  args: {
    flag: { ...sampleFlag, isEnabled: false, rolloutPercent: 0 },
    onToggle: () => undefined,
  },
};

export const ReadOnly: Story = {};

export const Interactive: Story = {
  render: function InteractiveFlag(args) {
    const [enabled, setEnabled] = React.useState(args.flag.isEnabled);
    return <FeatureFlagRow flag={{ ...args.flag, isEnabled: enabled }} onToggle={setEnabled} />;
  },
};
