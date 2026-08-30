import type { Meta, StoryObj } from "@storybook/react";

import { CohortTable } from "./cohort-table";

const meta: Meta<typeof CohortTable> = {
  title: "Admin/CohortTable",
  component: CohortTable,
  tags: ["autodocs"],
  args: {
    cohorts: [
      { cohortMonth: "2026-06", customers: 40, repeatCustomers: 8, repeatRate: 0.2 },
      { cohortMonth: "2026-07", customers: 55, repeatCustomers: 12, repeatRate: 0.218 },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof CohortTable>;

export const Default: Story = {};

export const Empty: Story = { args: { cohorts: [] } };
