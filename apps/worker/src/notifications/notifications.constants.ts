import { NOTIFICATIONS_QUEUE } from "@ecom/types";

export { NOTIFICATIONS_QUEUE };

export function truncateDeliveryError(message: string): string {
  const redacted = message
    .replace(/otpCode[=:]\s*\S+/gi, "otpCode=[redacted]")
    .replace(/password[=:]\s*\S+/gi, "password=[redacted]");
  return redacted.slice(0, 500);
}
