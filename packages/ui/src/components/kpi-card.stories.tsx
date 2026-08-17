import type { Meta, StoryObj } from "@storybook/react";

import { KpiCard } from "./kpi-card";

const meta: Meta<typeof KpiCard> = {
  title: "Admin/KpiCard",
  component: KpiCard,
  tags: ["autodocs"],
  args: {
    label: "Revenue",
    value: "₹4,82,190",
    definition: "Gross merchandise value for the selected range, excluding cancelled orders.",
    deltaLabel: "+8.2% vs prior period",
    tone: "success",
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

export const Default: Story = {};

export const Warning: Story = {
  args: {
    label: "Cart abandonment",
    value: "42.8%",
    definition: "Share of created carts that did not reach a paid order.",
    deltaLabel: "+4.1% vs prior period",
    tone: "warning",
  },
};

export const Danger: Story = {
  args: {
    label: "Failed payments",
    value: "18",
    definition: "Payments that failed authorization in the selected range.",
    deltaLabel: "+11 vs yesterday",
    tone: "danger",
  },
};
