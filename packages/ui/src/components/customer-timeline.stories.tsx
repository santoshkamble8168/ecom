import type { Meta, StoryObj } from "@storybook/react";

import { CustomerTimeline } from "./customer-timeline";

const meta: Meta<typeof CustomerTimeline> = {
  title: "Admin/CustomerTimeline",
  component: CustomerTimeline,
  tags: ["autodocs"],
  args: {
    events: [
      {
        id: "evt-1",
        kind: "order",
        title: "Placed order #1001",
        detail: "₹2,498 · 3 items",
        createdAt: "2026-08-17T10:12:00.000Z",
      },
      {
        id: "evt-2",
        kind: "note",
        title: "Support note added",
        detail: "Customer asked about exchange for size M.",
        createdAt: "2026-08-16T14:40:00.000Z",
      },
      {
        id: "evt-3",
        kind: "return",
        title: "Return requested",
        detail: "RMA-204 · Oversized tee",
        createdAt: "2026-08-15T09:05:00.000Z",
      },
      {
        id: "evt-4",
        kind: "review",
        title: "Left a 5-star review",
        createdAt: "2026-08-12T18:22:00.000Z",
      },
    ],
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
type Story = StoryObj<typeof CustomerTimeline>;

export const Default: Story = {};

export const Empty: Story = {
  args: { events: [] },
};
