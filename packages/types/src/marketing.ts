/**
 * Marketing foundation placeholders (Sprint 11) — deliberately minimal
 * referral/gift-card/loyalty hooks per the sprint plan's "foundation...
 * without full advanced program rollout." No earn/redeem rule engine.
 */

export interface ReferralCodeSummary {
  userId: string;
  code: string;
  createdAt: string;
}

export interface GiftCardSummary {
  id: string;
  code: string;
  initialValue: string;
  balance: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateGiftCardInput {
  initialValue: string;
  expiresAt?: string | null;
}

export interface LoyaltyAccountSummary {
  userId: string;
  pointsBalance: number;
  updatedAt: string;
}

export interface AdjustLoyaltyPointsInput {
  delta: number;
  reason: string;
}
