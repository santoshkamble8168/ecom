/** Seeded demo emails — fixed OTP works for these in development only. */
export const DEMO_ACCOUNT_EMAILS = [
  "admin@ecom.local",
  "catalog@ecom.local",
  "customer@ecom.local",
] as const;

export const DEV_DEMO_OTP = process.env.DEV_DEMO_OTP ?? "123456";

export function isDemoAccountEmail(email: string): boolean {
  return (DEMO_ACCOUNT_EMAILS as readonly string[]).includes(email.toLowerCase());
}

export function isDevDemoOtpBypass(email: string, code: string): boolean {
  return process.env.NODE_ENV === "development" && isDemoAccountEmail(email) && code === DEV_DEMO_OTP;
}
