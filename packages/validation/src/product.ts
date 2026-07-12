import { z } from "zod";

export const deliveryEstimateSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  productSlug: z.string().min(1).optional(),
});

export const wishlistAddSchema = z.object({
  productSlug: z.string().min(1),
  variantSku: z.string().optional(),
  sessionId: z.string().min(8).optional(),
});

export const recentlyViewedSchema = z.object({
  productSlug: z.string().min(1),
  sessionId: z.string().min(8).optional(),
});

export type DeliveryEstimateInput = z.infer<typeof deliveryEstimateSchema>;
export type WishlistAddInput = z.infer<typeof wishlistAddSchema>;
export type RecentlyViewedInput = z.infer<typeof recentlyViewedSchema>;
