import type { Meta, StoryObj } from "@storybook/react";

import { ReportCard } from "./report-card";

const meta: Meta<typeof ReportCard> = {
  title: "Admin/ReportCard",
  component: ReportCard,
  tags: ["autodocs"],
  args: {
    name: "Sales summary",
    kind: "sales",
    description: "Orders, revenue, discounts, and tax collected for the selected range.",
    onExport: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReportCard>;

export const Default: Story = {};

export const ExportDisabled: Story = {
  args: {
    exportDisabled: true,
  },
};
