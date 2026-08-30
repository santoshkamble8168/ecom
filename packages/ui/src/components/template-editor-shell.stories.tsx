import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { TemplateEditorShell } from "./template-editor-shell";

const meta: Meta<typeof TemplateEditorShell> = {
  title: "Admin/TemplateEditorShell",
  component: TemplateEditorShell,
  tags: ["autodocs"],
  args: {
    templateKey: "order.confirmed",
    name: "Order confirmation",
    subject: "Your order {{orderNumber}} is confirmed",
    body: "<p>Hi {{customerName}}, thanks for your order.</p>",
    requiredVariables: ["orderNumber", "customerName"],
    onSubjectChange: () => undefined,
    onBodyChange: () => undefined,
    onPreview: () => undefined,
    onTestSend: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TemplateEditorShell>;

export const Default: Story = {};

export const NoVariables: Story = {
  args: {
    requiredVariables: [],
  },
};

export const Interactive: Story = {
  render: function InteractiveEditor(args) {
    const [subject, setSubject] = React.useState(args.subject);
    const [body, setBody] = React.useState(args.body);
    return (
      <TemplateEditorShell
        {...args}
        subject={subject}
        body={body}
        onSubjectChange={setSubject}
        onBodyChange={setBody}
      />
    );
  },
};
