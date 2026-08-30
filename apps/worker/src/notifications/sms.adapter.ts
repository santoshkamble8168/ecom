import { Logger } from "@nestjs/common";

export type SmsProviderMode = "mock" | "disabled";

export interface SmsSendResult {
  status: "sent" | "skipped";
  providerMessageId: string | null;
}

/**
 * MVP SMS adapter: mock logs the payload; `disabled` records a skip.
 * A real provider (Twilio, MSG91) would replace this without changing the processor contract.
 */
export async function sendSms(destination: string, body: string): Promise<SmsSendResult> {
  const mode = (process.env.SMS_PROVIDER ?? "mock") as SmsProviderMode;
  const logger = new Logger("SmsAdapter");

  if (mode === "disabled") {
    logger.warn(`SMS disabled; not sending to ${destination}`);
    return { status: "skipped", providerMessageId: null };
  }

  logger.log(`Mock SMS to ${destination}: ${body.slice(0, 160)}`);
  return { status: "sent", providerMessageId: `mock-sms-${Date.now()}` };
}
