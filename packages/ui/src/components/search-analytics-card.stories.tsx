import type { Meta, StoryObj } from "@storybook/react";

import { SearchAnalyticsCard } from "./search-analytics-card";

const meta: Meta<typeof SearchAnalyticsCard> = {
  title: "Admin/SearchAnalyticsCard",
  component: SearchAnalyticsCard,
  tags: ["autodocs"],
  args: {
    snapshot: {
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-30T23:59:59.999Z",
      totalSearches: 240,
      zeroResultRate: 0.125,
      topQueries: [
        { query: "oversized tee", searches: 40, zeroResults: 2 },
        { query: "xyzzy", searches: 8, zeroResults: 8 },
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof SearchAnalyticsCard>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    snapshot: {
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-30T23:59:59.999Z",
      totalSearches: 0,
      zeroResultRate: 0,
      topQueries: [],
    },
  },
};
