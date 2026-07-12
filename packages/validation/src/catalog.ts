import { z } from "zod";

export const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens");

export const skuSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9-]+$/, "SKU must be uppercase alphanumeric with hyphens");

export const createProductSchema = z.object({
  title: z.string().min(2).max(200),
  slug: slugSchema.optional(),
  description: z.string().max(5000).optional(),
  brand: z.string().max(100).optional(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  categorySlugs: z.array(slugSchema).optional(),
  collectionSlugs: z.array(slugSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  sku: skuSchema,
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  optionValueSlugs: z.array(z.string()).min(1),
});

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
  parentSlug: slugSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createCollectionSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const addProductMediaSchema = z.object({
  url: z.string().url(),
  altText: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "review", "published", "archived"]).optional(),
  categorySlug: slugSchema.optional(),
  collectionSlug: slugSchema.optional(),
  search: z.string().max(100).optional(),
});
