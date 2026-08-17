import type { Meta, StoryObj } from "@storybook/react";

import { AuditTable, type AuditTableLog } from "./audit-table";

const sampleLogs: AuditTableLog[] = [
  {
    id: "log-1",
    action: "customer.suspend",
    actorEmail: "ops@example.com",
    entityType: "customer",
    createdAt: "2026-08-17T11:04:00.000Z",
  },
  {
    id: "log-2",
    action: "feature_flag.update",
    actorEmail: "admin@example.com",
    entityType: "feature_flag",
    createdAt: "2026-08-17T09:18:00.000Z",
  },
  {
    id: "log-3",
    action: "settings.patch",
    actorEmail: null,
    entityType: "platform_setting",
    createdAt: "2026-08-16T21:42:00.000Z",
  },
];

const meta: Meta<typeof AuditTable> = {
  title: "Admin/AuditTable",
  component: AuditTable,
  tags: ["autodocs"],
  args: {
    logs: sampleLogs,
  },
};

export default meta;
type Story = StoryObj<typeof AuditTable>;

export const Default: Story = {};

export const ClickableRows: Story = {
  args: {
    onRowClick: () => undefined,
  },
};

export const Empty: Story = {
  args: { logs: [] },
};
