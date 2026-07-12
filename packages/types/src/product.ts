import type { ProductDetail, ProductSummary } from "./catalog";

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<string, number>;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  authorName: string | null;
  createdAt: string;
}

export interface PdpHighlight {
  label: string;
  value: string;
}

export interface PdpProduct extends ProductDetail {
  reviewSummary: ReviewSummary;
  highlights: PdpHighlight[];
  relatedProducts: ProductSummary[];
  inStock: boolean;
}

export interface WishlistItem {
  id: string;
  productSlug: string;
  variantSku: string | null;
  product: ProductSummary | null;
  createdAt: string;
}

export interface RecentlyViewedItem {
  productSlug: string;
  viewedAt: string;
  product: ProductSummary | null;
}

export interface DeliveryEstimate {
  pincode: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  codAvailable: boolean;
  freeShippingEligible: boolean;
  message: string;
}
