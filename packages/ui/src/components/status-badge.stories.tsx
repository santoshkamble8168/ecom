import type { Meta, StoryObj } from "@storybook/react";

import { StatusBadge } from "./product-card";

const meta: Meta<typeof StatusBadge> = {
  title: "Commerce/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["draft", "review", "published", "archived"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Draft: Story = {
  args: { status: "draft" },
};

export const InReview: Story = {
  args: { status: "review" },
};

export const Published: Story = {
  args: { status: "published" },
};

export const Archived: Story = {
  args: { status: "archived" },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status="draft" />
      <StatusBadge status="review" />
      <StatusBadge status="published" />
      <StatusBadge status="archived" />
    </div>
  ),
};
