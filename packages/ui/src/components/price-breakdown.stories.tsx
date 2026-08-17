import type { Meta, StoryObj } from "@storybook/react";

import { PriceBreakdown } from "./price-breakdown";

const meta: Meta<typeof PriceBreakdown> = {
  title: "Commerce/PriceBreakdown",
  component: PriceBreakdown,
  tags: ["autodocs"],
  args: {
    lines: [
      { label: "Subtotal", amount: "₹2,499" },
      { label: "Sale discount", amount: "−₹500", muted: true },
      { label: "Coupon WELCOME10", amount: "−₹200", muted: true },
      { label: "Shipping", amount: "Free", muted: true },
      { label: "Tax", amount: "₹359" },
      { label: "Total", amount: "₹2,158", emphasize: true },
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PriceBreakdown>;

export const CartTotals: Story = {};

export const NoDiscounts: Story = {
  args: {
    lines: [
      { label: "Subtotal", amount: "₹999" },
      { label: "Shipping", amount: "₹49" },
      { label: "Total", amount: "₹1,048", emphasize: true },
    ],
  },
};
