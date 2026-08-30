import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { NotificationPreferenceRow } from "./notification-preference-row";

const meta: Meta<typeof NotificationPreferenceRow> = {
  title: "Admin/NotificationPreferenceRow",
  component: NotificationPreferenceRow,
  tags: ["autodocs"],
  args: {
    label: "Marketing email",
    description: "Promotions, product recommendations, and newsletters.",
    checked: true,
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
type Story = StoryObj<typeof NotificationPreferenceRow>;

export const Marketing: Story = {
  args: {
    onChange: () => undefined,
  },
};

export const TransactionalReadOnly: Story = {
  args: {
    label: "Transactional email",
    description: "Order confirmations, shipping updates, and account security. Always on.",
    checked: true,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: function InteractivePreference(args) {
    const [checked, setChecked] = React.useState(args.checked);
    return <NotificationPreferenceRow {...args} checked={checked} onChange={setChecked} />;
  },
};
