import { z } from "zod";

import { slugSchema } from "./catalog";
import {
  formSkuSchema,
  moneyStringSchema,
  nonNegativeIntStringSchema,
  optionalDatetimeLocalSchema,
  optionalMoneyStringSchema,
  optionalPositiveIntStringSchema,
  optionalTextSchema,
  requiredTextSchema,
} from "./form-helpers";

export const createPriceListFormSchema = z.object({
  code: z.string().trim().pipe(slugSchema),
  name: requiredTextSchema(120),
  currency: z.string().trim().length(3, "Currency must be a 3-letter code"),
  isDefault: z.boolean(),
});

export const upsertProductPriceFormSchema = z
  .object({
    variantSku: formSkuSchema,
    priceListId: z.string().min(1, "Price list is required"),
    mrp: moneyStringSchema,
    sellingPrice: moneyStringSchema,
    salePrice: optionalMoneyStringSchema,
    saleStartsAt: optionalDatetimeLocalSchema,
    saleEndsAt: optionalDatetimeLocalSchema,
    reason: optionalTextSchema(300),
  })
  .refine((values) => !values.saleStartsAt || !values.saleEndsAt || values.saleStartsAt < values.saleEndsAt, {
    message: "Sale end must be after sale start",
    path: ["saleEndsAt"],
  });

export const taxRuleFormSchema = z.object({
  name: requiredTextSchema(150),
  ratePercent: z
    .string()
    .trim()
    .refine((value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0, {
      message: "Enter a rate of 0 or more",
    }),
  appliesTo: requiredTextSchema(50),
  categoryId: optionalTextSchema(64),
  priority: nonNegativeIntStringSchema,
  isActive: z.boolean().optional(),
});

export const createTaxRuleFormSchema = taxRuleFormSchema.omit({ isActive: true });

export const simulatePriceFormSchema = z.object({
  variantSku: formSkuSchema,
  quantity: optionalPositiveIntStringSchema,
  couponCode: optionalTextSchema(64),
});

export type CreatePriceListFormValues = z.infer<typeof createPriceListFormSchema>;
export type UpsertProductPriceFormValues = z.infer<typeof upsertProductPriceFormSchema>;
export type TaxRuleFormValues = z.infer<typeof taxRuleFormSchema>;
export type CreateTaxRuleFormValues = z.infer<typeof createTaxRuleFormSchema>;
export type SimulatePriceFormValues = z.infer<typeof simulatePriceFormSchema>;
