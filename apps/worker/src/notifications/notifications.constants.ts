export const NOTIFICATIONS_QUEUE = "notifications";

export type NotificationJobName = "send-email" | "send-sms";

export interface NotificationJobData {
  destination: string;
  templateKey: string;
  payload: Record<string, unknown>;
}
