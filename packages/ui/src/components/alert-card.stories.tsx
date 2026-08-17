import type { Meta, StoryObj } from "@storybook/react";

import { AlertCard } from "./alert-card";

const meta: Meta<typeof AlertCard> = {
  title: "Admin/AlertCard",
  component: AlertCard,
  tags: ["autodocs"],
  args: {
    severity: "info",
    title: "Search no-results spike",
    detail: "142 searches returned no products in the last 24 hours.",
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
type Story = StoryObj<typeof AlertCard>;

export const Info: Story = {};

export const Warning: Story = {
  args: {
    severity: "warning",
    title: "Low stock on 12 SKUs",
    detail: "Inventory is below the reorder point in the primary warehouse.",
    href: "/inventory?alert=low-stock",
  },
};

export const Danger: Story = {
  args: {
    severity: "danger",
    title: "Failed payments",
    detail: "18 authorizations failed in the last hour.",
    href: "/orders?payment=failed",
  },
};
