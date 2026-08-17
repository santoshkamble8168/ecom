import { z } from "zod";

export const moneyStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 99.00)");

export const optionalMoneyStringSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Enter a valid amount (e.g. 99.00)",
  });

export const requiredTextSchema = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, "This field is required")
    .max(max, `Must be at most ${max} characters`);

export const optionalTextSchema = (max: number) =>
  z.string().max(max, `Must be at most ${max} characters`);

export const optionalPositiveIntStringSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) >= 1), {
    message: "Enter a whole number of 1 or more",
  });

export const nonNegativeIntStringSchema = z
  .string()
  .trim()
  .refine((value) => /^\d+$/.test(value), { message: "Enter a whole number of 0 or more" });

export const nonZeroIntStringSchema = z
  .string()
  .trim()
  .refine((value) => /^-?\d+$/.test(value) && Number(value) !== 0, {
    message: "Enter a non-zero whole number",
  });

export const positiveIntStringSchema = z
  .string()
  .trim()
  .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, {
    message: "Enter a whole number of 1 or more",
  });

export const optionalDatetimeLocalSchema = z.string();

export const requiredDatetimeLocalSchema = z.string().trim().min(1, "This field is required");

export const cmsSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase alphanumeric with hyphens");

export const formSkuSchema = z.string().trim().min(1, "SKU is required").max(64);

export const seoFormSchema = z.object({
  seoTitle: optionalTextSchema(200),
  seoDescription: optionalTextSchema(500),
  seoCanonicalUrl: optionalTextSchema(500),
  seoOgImage: optionalTextSchema(500),
});

export type SeoFormValues = z.infer<typeof seoFormSchema>;

export const scheduleContentFormSchema = z.object({
  scheduledAt: z
    .string()
    .trim()
    .min(1, "Pick a date and time")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date and time")
    .refine((value) => new Date(value).getTime() > Date.now(), "Schedule time must be in the future"),
});

export type ScheduleContentFormValues = z.infer<typeof scheduleContentFormSchema>;
