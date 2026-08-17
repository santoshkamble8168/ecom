/** Promotion domain (Sprint 10): coupon rules/usage and time-driven discount campaigns. */

export type CouponType = "percent" | "fixed" | "free_shipping";
export type CampaignType = "sitewide" | "collection" | "product";
export type CampaignStatus = "scheduled" | "active" | "ended" | "cancelled";

export interface CouponSummary {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: string;
  minCartValue: string | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  combinable: boolean;
  eligibleCategoryIds: string[];
  eligibleCollectionIds: string[];
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UpsertCouponInput {
  code: string;
  description?: string;
  type: CouponType;
  value: string;
  minCartValue?: string | null;
  maxUses?: number | null;
  perUserLimit?: number | null;
  combinable?: boolean;
  eligibleCategoryIds?: string[];
  eligibleCollectionIds?: string[];
  expiresAt?: string | null;
  isActive?: boolean;
}

export interface CouponUsageSummary {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string | null;
  orderId: string | null;
  discountAmount: string;
  usedAt: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  slug: string;
  type: CampaignType;
  status: CampaignStatus;
  discountType: CouponType | null;
  discountValue: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  productSkus: string[];
  collectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCampaignInput {
  name: string;
  slug: string;
  type: CampaignType;
  discountType?: CouponType | null;
  discountValue?: string | null;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
  productSkus?: string[];
  collectionIds?: string[];
}
