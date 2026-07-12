import { z } from "zod";

export const FREE_SHIPPING_THRESHOLD = 999;

export const addCartItemSchema = z.object({
  productSlug: z.string().min(1),
  variantSku: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
  sessionId: z.string().min(8).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

export const applyCouponSchema = z.object({
  code: z.string().min(2).max(32),
  sessionId: z.string().min(8).optional(),
});

export const cartMergeSchema = z.object({
  sessionId: z.string().min(8),
});

export const saveForLaterSchema = z.object({
  itemId: z.string().uuid(),
  sessionId: z.string().min(8).optional(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CartMergeInput = z.infer<typeof cartMergeSchema>;
