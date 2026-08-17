import { z } from "zod";

import {
  cmsSlugSchema,
  optionalTextSchema,
  requiredTextSchema,
  seoFormSchema,
} from "./form-helpers";

export const blogPostFormSchema = z.object({
  slug: cmsSlugSchema,
  title: requiredTextSchema(200, 2),
  excerpt: optionalTextSchema(500),
  coverImageUrl: optionalTextSchema(2000),
  authorName: requiredTextSchema(120),
  contentHtml: z.string().trim().min(1, "Content is required"),
  relatedSkus: z.string(),
  categoryIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  seo: seoFormSchema,
});

export const blogNameFormSchema = z.object({
  name: requiredTextSchema(100, 2),
});

export type BlogPostFormValues = z.infer<typeof blogPostFormSchema>;
export type BlogNameFormValues = z.infer<typeof blogNameFormSchema>;
