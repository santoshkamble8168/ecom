import type { DeliveryLogEntry } from "@ecom/types";
import type { Meta, StoryObj } from "@storybook/react";

import { DeliveryLogTable } from "./delivery-log-table";

const sampleLogs: DeliveryLogEntry[] = [
  {
    id: "del-1",
    userId: "user-1",
    templateKey: "order.confirmed",
    channel: "email",
    category: "transactional",
    destination: "customer@ecom.local",
    status: "sent",
    eventType: "order.placed",
    attempt: 1,
    errorMessage: null,
    createdAt: "2026-08-17T11:04:00.000Z",
    sentAt: "2026-08-17T11:04:02.000Z",
  },
  {
    id: "del-2",
    userId: "user-2",
    templateKey: "campaign.flash_sale",
    channel: "sms",
    category: "marketing",
    destination: "+919876543210",
    status: "queued",
    eventType: "campaign.launched",
    attempt: 1,
    errorMessage: null,
    createdAt: "2026-08-17T11:08:00.000Z",
    sentAt: null,
  },
  {
    id: "del-3",
    userId: null,
    templateKey: "auth.otp",
    channel: "email",
    category: "transactional",
    destination: "guest@ecom.local",
    status: "failed",
    eventType: "auth.otp_requested",
    attempt: 2,
    errorMessage: "SMTP timeout",
    createdAt: "2026-08-17T10:42:00.000Z",
    sentAt: null,
  },
];

const meta: Meta<typeof DeliveryLogTable> = {
  title: "Admin/DeliveryLogTable",
  component: DeliveryLogTable,
  tags: ["autodocs"],
  args: {
    logs: sampleLogs,
  },
};

export default meta;
type Story = StoryObj<typeof DeliveryLogTable>;

export const Default: Story = {};

export const Empty: Story = {
  args: { logs: [] },
};
