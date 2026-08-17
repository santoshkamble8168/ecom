import { z } from "zod";

import {
  cmsSlugSchema,
  nonNegativeIntStringSchema,
  optionalDatetimeLocalSchema,
  optionalTextSchema,
  requiredTextSchema,
  seoFormSchema,
} from "./form-helpers";

export const PAGE_TYPE_VALUES = ["homepage", "landing", "campaign", "policy", "faq"] as const;
export const BANNER_PLACEMENT_VALUES = [
  "homepage_hero",
  "homepage_strip",
  "category_top",
  "cart_strip",
] as const;

export const pageFormSchema = z.object({
  type: z.enum(PAGE_TYPE_VALUES),
  slug: cmsSlugSchema,
  title: requiredTextSchema(200),
  fields: z.record(z.unknown()),
  seo: seoFormSchema,
});

export const bannerFormSchema = z
  .object({
    title: requiredTextSchema(200),
    imageUrl: requiredTextSchema(2000),
    mobileImageUrl: optionalTextSchema(2000),
    linkUrl: optionalTextSchema(2000),
    altText: optionalTextSchema(200),
    placement: z.enum(BANNER_PLACEMENT_VALUES),
    sortOrder: nonNegativeIntStringSchema,
    startsAt: optionalDatetimeLocalSchema,
    endsAt: optionalDatetimeLocalSchema,
  })
  .refine((values) => !values.startsAt || !values.endsAt || values.startsAt < values.endsAt, {
    message: "End must be after start",
    path: ["endsAt"],
  });

export const createMenuFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase alphanumeric with hyphens"),
  name: requiredTextSchema(100),
});

export const menuItemFormSchema = z.object({
  label: requiredTextSchema(120),
  url: requiredTextSchema(500),
  sortOrder: nonNegativeIntStringSchema,
  opensInNewTab: z.boolean(),
  isActive: z.boolean(),
});

export type PageFormValues = z.infer<typeof pageFormSchema>;
export type BannerFormValues = z.infer<typeof bannerFormSchema>;
export type CreateMenuFormValues = z.infer<typeof createMenuFormSchema>;
export type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;
