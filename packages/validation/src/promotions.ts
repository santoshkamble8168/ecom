import { z } from "zod";

import { slugSchema } from "./catalog";
import {
  formSkuSchema,
  moneyStringSchema,
  optionalDatetimeLocalSchema,
  optionalMoneyStringSchema,
  optionalPositiveIntStringSchema,
  optionalTextSchema,
  requiredDatetimeLocalSchema,
  requiredTextSchema,
} from "./form-helpers";

export const COUPON_TYPE_VALUES = ["percent", "fixed", "free_shipping"] as const;
export const CAMPAIGN_TYPE_VALUES = ["sitewide", "collection", "product"] as const;

export const couponFormSchema = z.object({
  code: requiredTextSchema(64),
  description: optionalTextSchema(500),
  type: z.enum(COUPON_TYPE_VALUES),
  value: moneyStringSchema,
  minCartValue: optionalMoneyStringSchema,
  maxUses: optionalPositiveIntStringSchema,
  perUserLimit: optionalPositiveIntStringSchema,
  combinable: z.boolean(),
  eligibleCategoryIds: z.string(),
  eligibleCollectionIds: z.string(),
  expiresAt: optionalDatetimeLocalSchema,
  isActive: z.boolean(),
});

export const campaignFormSchema = z
  .object({
    name: requiredTextSchema(150),
    slug: z.string().trim().pipe(slugSchema),
    type: z.enum(CAMPAIGN_TYPE_VALUES),
    discountType: z.union([z.enum(COUPON_TYPE_VALUES), z.literal("")]),
    discountValue: optionalMoneyStringSchema,
    startsAt: requiredDatetimeLocalSchema,
    endsAt: requiredDatetimeLocalSchema,
    isActive: z.boolean(),
  })
  .refine((values) => values.startsAt < values.endsAt, {
    message: "End must be after start",
    path: ["endsAt"],
  })
  .refine((values) => !values.discountType || values.discountValue.trim() !== "", {
    message: "Discount value is required when a discount type is set",
    path: ["discountValue"],
  });

export const campaignSkuFormSchema = z.object({
  variantSku: formSkuSchema,
});

export const campaignCollectionFormSchema = z.object({
  collectionId: z.string().trim().min(1, "Collection ID is required"),
});

export type CouponFormValues = z.infer<typeof couponFormSchema>;
export type CampaignFormValues = z.infer<typeof campaignFormSchema>;
export type CampaignSkuFormValues = z.infer<typeof campaignSkuFormSchema>;
export type CampaignCollectionFormValues = z.infer<typeof campaignCollectionFormSchema>;
