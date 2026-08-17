import type { Meta, StoryObj } from "@storybook/react";

import { DashboardChart } from "./dashboard-chart";

const revenuePoints = [
  { date: "2026-08-10", value: 48200 },
  { date: "2026-08-11", value: 51350 },
  { date: "2026-08-12", value: 44890 },
  { date: "2026-08-13", value: 62110 },
  { date: "2026-08-14", value: 58740 },
  { date: "2026-08-15", value: 70420 },
  { date: "2026-08-16", value: 66580 },
];

const meta: Meta<typeof DashboardChart> = {
  title: "Admin/DashboardChart",
  component: DashboardChart,
  tags: ["autodocs"],
  args: {
    label: "Revenue trend",
    unit: "INR",
    points: revenuePoints,
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
type Story = StoryObj<typeof DashboardChart>;

export const RevenueTrend: Story = {};

export const Empty: Story = {
  args: { points: [] },
};
