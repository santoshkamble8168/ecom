import { NotFoundError, ValidationError } from "@ecom/shared";
import type {
  GiftCardSummary,
  LoyaltyAccountSummary,
  ReferralCodeSummary,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";
import type { GiftCard, LoyaltyAccount, ReferralCode } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { AdjustLoyaltyPointsDto } from "./dto/adjust-loyalty-points.dto";
import type { CreateGiftCardDto } from "./dto/create-gift-card.dto";
import type { MarketingPaginationQueryDto } from "./dto/pagination-query.dto";
import { generateRandomCode } from "./utils/code-generator";

const MAX_CODE_GENERATION_ATTEMPTS = 5;

export interface AdminReferralCodeSummary extends ReferralCodeSummary {
  customerEmail: string | null;
  customerName: string | null;
}

export interface AdminReferralListResult {
  referrals: AdminReferralCodeSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GiftCardListResult {
  giftCards: GiftCardSummary[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------
  // Customer-facing
  // ---------------------------------------------------------------------

  /**
   * Lazily creates a ReferralCode for the user on first request, mirroring
   * the idempotent-creation pattern used for invoices in OrdersService.
   */
  async getOrCreateReferralCode(userId: string): Promise<ReferralCodeSummary> {
    const existing = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (existing) return this.toReferralSummary(existing);

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      try {
        const created = await this.prisma.referralCode.create({
          data: { userId, code: generateRandomCode(8) },
        });
        return this.toReferralSummary(created);
      } catch (error) {
        lastError = error;
        // Another concurrent request may have already created this user's
        // code (userId collision) — return it instead of retrying. A `code`
        // collision (astronomically unlikely at 36^8 combinations) falls
        // through to the next attempt with a freshly generated code.
        const raced = await this.prisma.referralCode.findUnique({ where: { userId } });
        if (raced) return this.toReferralSummary(raced);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to generate a unique referral code");
  }

  /** Lazily creates a LoyaltyAccount (pointsBalance: 0) for the user on first request. */
  async getOrCreateLoyaltyAccount(userId: string): Promise<LoyaltyAccountSummary> {
    const existing = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (existing) return this.toLoyaltySummary(existing);

    try {
      const created = await this.prisma.loyaltyAccount.create({ data: { userId, pointsBalance: 0 } });
      return this.toLoyaltySummary(created);
    } catch {
      return this.toLoyaltySummary(await this.prisma.loyaltyAccount.findUniqueOrThrow({ where: { userId } }));
    }
  }

  // ---------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------

  async adminListReferrals(query: MarketingPaginationQueryDto): Promise<AdminReferralListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.referralCode.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true, displayName: true } } },
      }),
      this.prisma.referralCode.count(),
    ]);

    return {
      referrals: rows.map((row) => ({
        ...this.toReferralSummary(row),
        customerEmail: row.user?.email ?? null,
        customerName: row.user?.displayName ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async adminListGiftCards(query: MarketingPaginationQueryDto): Promise<GiftCardListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.giftCard.count(),
    ]);

    return {
      giftCards: rows.map((row) => this.toGiftCardSummary(row)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Creates a gift card with `balance` seeded to `initialValue`. This is a
   * placeholder for the gift-card foundation only — there is NO redemption
   * or spend flow yet (no checkout integration, no balance deduction).
   */
  async adminCreateGiftCard(dto: CreateGiftCardDto, adminId: string): Promise<GiftCardSummary> {
    let created: GiftCard | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      try {
        created = await this.prisma.giftCard.create({
          data: {
            code: generateRandomCode(8),
            initialValue: dto.initialValue,
            balance: dto.initialValue,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          },
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!created) {
      throw lastError instanceof Error ? lastError : new Error("Failed to generate a unique gift card code");
    }

    await this.audit.log({
      userId: adminId,
      action: "GiftCardCreated",
      entityType: "gift_card",
      entityId: created.id,
      metadata: { code: created.code, initialValue: dto.initialValue },
    });

    return this.toGiftCardSummary(created);
  }

  async adminGetLoyaltyAccount(userId: string): Promise<LoyaltyAccountSummary> {
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (!account) throw new NotFoundError("Loyalty account not found");
    return this.toLoyaltySummary(account);
  }

  /**
   * Manual admin points adjustment — there is NO automated earn/redeem rule
   * engine in this pass (e.g. no points-per-order accrual, no reward catalog).
   */
  async adminAdjustLoyaltyPoints(
    userId: string,
    dto: AdjustLoyaltyPointsDto,
    adminId: string,
  ): Promise<LoyaltyAccountSummary> {
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (!account) throw new NotFoundError("Loyalty account not found");

    const newBalance = account.pointsBalance + dto.delta;
    if (newBalance < 0) {
      throw new ValidationError("This adjustment would result in a negative points balance");
    }

    const updated = await this.prisma.loyaltyAccount.update({
      where: { userId },
      data: { pointsBalance: newBalance },
    });

    await this.audit.log({
      userId: adminId,
      action: "LoyaltyPointsAdjusted",
      entityType: "loyalty_account",
      entityId: userId,
      metadata: { delta: dto.delta, reason: dto.reason, newBalance },
    });

    return this.toLoyaltySummary(updated);
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private toReferralSummary(row: ReferralCode): ReferralCodeSummary {
    return { userId: row.userId, code: row.code, createdAt: row.createdAt.toISOString() };
  }

  private toGiftCardSummary(row: GiftCard): GiftCardSummary {
    return {
      id: row.id,
      code: row.code,
      initialValue: row.initialValue.toString(),
      balance: row.balance.toString(),
      isActive: row.isActive,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toLoyaltySummary(row: LoyaltyAccount): LoyaltyAccountSummary {
    return { userId: row.userId, pointsBalance: row.pointsBalance, updatedAt: row.updatedAt.toISOString() };
  }
}
