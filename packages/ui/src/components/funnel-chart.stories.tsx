import type { FunnelStep } from "@ecom/types";
import type { Meta, StoryObj } from "@storybook/react";

import { FunnelChart } from "./funnel-chart";

const steps: FunnelStep[] = [
  { key: "homepage", label: "Homepage", sessions: 1200, conversionFromPrevious: null },
  { key: "plp", label: "PLP", sessions: 840, conversionFromPrevious: 0.7 },
  { key: "pdp", label: "PDP", sessions: 510, conversionFromPrevious: 0.607 },
  { key: "cart", label: "Add to cart", sessions: 220, conversionFromPrevious: 0.431 },
  { key: "checkout", label: "Checkout", sessions: 140, conversionFromPrevious: 0.636 },
  { key: "payment", label: "Payment", sessions: 110, conversionFromPrevious: 0.786 },
  { key: "order", label: "Order", sessions: 92, conversionFromPrevious: 0.836 },
];

const meta: Meta<typeof FunnelChart> = {
  title: "Admin/FunnelChart",
  component: FunnelChart,
  tags: ["autodocs"],
  args: { steps },
};

export default meta;
type Story = StoryObj<typeof FunnelChart>;

export const Default: Story = {};

export const Empty: Story = { args: { steps: [] } };
