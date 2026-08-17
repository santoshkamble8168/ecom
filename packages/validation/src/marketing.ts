import { z } from "zod";

import {
  moneyStringSchema,
  nonZeroIntStringSchema,
  optionalDatetimeLocalSchema,
  requiredTextSchema,
} from "./form-helpers";

export const createGiftCardFormSchema = z.object({
  initialValue: moneyStringSchema,
  expiresAt: optionalDatetimeLocalSchema,
});

export const loyaltyLookupFormSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
});

export const adjustLoyaltyFormSchema = z.object({
  delta: nonZeroIntStringSchema,
  reason: requiredTextSchema(500),
});

export type CreateGiftCardFormValues = z.infer<typeof createGiftCardFormSchema>;
export type LoyaltyLookupFormValues = z.infer<typeof loyaltyLookupFormSchema>;
export type AdjustLoyaltyFormValues = z.infer<typeof adjustLoyaltyFormSchema>;
