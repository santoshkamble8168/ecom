import type { Meta, StoryObj } from "@storybook/react";

import {
  CAMPAIGN_STATUS_PILLS,
  CONTENT_STATUS_PILLS,
  DELIVERY_STATUS_PILLS,
  PURCHASE_ORDER_STATUS_PILLS,
  StatusPill,
} from "./status-pill";

const meta: Meta<typeof StatusPill> = {
  title: "Commerce/StatusPill",
  component: StatusPill,
  tags: ["autodocs"],
  args: {
    label: "Low Stock",
    tone: "warning",
  },
};

export default meta;
type Story = StoryObj<typeof StatusPill>;

export const LowStock: Story = {};

export const PurchaseOrderStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Object.values(PURCHASE_ORDER_STATUS_PILLS).map((pill) => (
        <StatusPill key={pill.label} label={pill.label} tone={pill.tone} />
      ))}
    </div>
  ),
};

export const CampaignStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Object.values(CAMPAIGN_STATUS_PILLS).map((pill) => (
        <StatusPill key={pill.label} label={pill.label} tone={pill.tone} />
      ))}
    </div>
  ),
};

export const ContentStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Object.values(CONTENT_STATUS_PILLS).map((pill) => (
        <StatusPill key={pill.label} label={pill.label} tone={pill.tone} />
      ))}
    </div>
  ),
};

export const DeliveryStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Object.values(DELIVERY_STATUS_PILLS).map((pill) => (
        <StatusPill key={pill.label} label={pill.label} tone={pill.tone} />
      ))}
    </div>
  ),
};

export const LongLabelTruncation: Story = {
  args: {
    label: "Partially Received From Overseas Supplier",
    tone: "warning",
  },
};
