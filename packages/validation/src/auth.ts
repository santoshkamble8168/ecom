import { z } from "zod";

export const otpChannelSchema = z.enum(["email", "sms"]);

export const requestOtpSchema = z.object({
  channel: otpChannelSchema,
  destination: z.string().min(3).max(255),
});

export const verifyOtpSchema = z.object({
  channel: otpChannelSchema,
  destination: z.string().min(3).max(255),
  code: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
