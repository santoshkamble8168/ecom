import type { Meta, StoryObj } from "@storybook/react";

import { SettingsForm } from "./settings-form";

const meta: Meta<typeof SettingsForm> = {
  title: "Admin/SettingsForm",
  component: SettingsForm,
  tags: ["autodocs"],
  args: {
    settings: [
      { key: "store.name", value: "Ecom Store" },
      { key: "orders.retention_days", value: "365" },
      { key: "checkout.guest_enabled", value: true },
    ],
    onSubmit: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsForm>;

export const Default: Story = {};
