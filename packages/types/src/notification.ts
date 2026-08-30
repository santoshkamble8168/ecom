/** Notification templates, preferences, delivery, and queue jobs. */

export type NotificationChannel = "email" | "sms" | "whatsapp" | "push" | "in_app";
export type NotificationCategory = "transactional" | "marketing" | "operational";
export type TemplateStatus = "draft" | "published" | "archived";
export type DeliveryStatus = "queued" | "sending" | "sent" | "failed" | "skipped";

export interface NotificationPreferences {
  emailTransactional: boolean;
  emailMarketing: boolean;
  smsTransactional: boolean;
  smsMarketing: boolean;
  unsubscribedAt: string | null;
  updatedAt: string;
}

/** Marketing opt-in only — transactional channels stay on for OTP and orders. */
export interface PatchNotificationPreferences {
  emailMarketing?: boolean;
  smsMarketing?: boolean;
}

export const NOTIFICATIONS_QUEUE = "notifications";

export interface NotificationTemplateSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  channel: NotificationChannel;
  category: NotificationCategory;
  status: TemplateStatus;
  requiredVariables: string[];
  latestVersion: number | null;
  updatedAt: string;
}

export interface NotificationTemplateVersion {
  id: string;
  version: number;
  subject: string | null;
  body: string;
  createdBy: string | null;
  createdAt: string;
}

export interface NotificationTemplateDetail extends NotificationTemplateSummary {
  versions: NotificationTemplateVersion[];
}

export interface DeliveryLogEntry {
  id: string;
  userId: string | null;
  templateKey: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  destination: string;
  status: DeliveryStatus;
  eventType: string;
  attempt: number;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface DeliveryLogListResult {
  logs: DeliveryLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationPreviewResult {
  subject: string | null;
  body: string;
}

/** BullMQ payload for the notifications queue (API enqueue, worker send). */
export interface NotificationSendJob {
  deliveryLogId: string;
  channel: NotificationChannel;
  destination: string;
  subject: string | null;
  body: string;
}
