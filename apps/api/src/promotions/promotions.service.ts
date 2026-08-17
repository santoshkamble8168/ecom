import { ConflictError, NotFoundError, ValidationError } from "@ecom/shared";
import type {
  CampaignSummary,
  CouponSummary,
  CouponType,
  CouponUsageSummary,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";
import type {
  Campaign as CampaignModel,
  CampaignCollection as CampaignCollectionModel,
  CampaignProduct as CampaignProductModel,
  Coupon as CouponModel,
  CouponUsage as CouponUsageModel,
  Prisma,
} from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { AttachCampaignCollectionsDto } from "./dto/attach-campaign-collections.dto";
import type { AttachCampaignProductsDto } from "./dto/attach-campaign-products.dto";
import type { ListCampaignsQueryDto } from "./dto/list-campaigns-query.dto";
import type { ListCouponsQueryDto } from "./dto/list-coupons-query.dto";
import type { UpdateCampaignDto } from "./dto/update-campaign.dto";
import type { UpdateCouponDto } from "./dto/update-coupon.dto";
import type { UpsertCampaignDto } from "./dto/upsert-campaign.dto";
import type { UpsertCouponDto } from "./dto/upsert-coupon.dto";
import { assertCampaignTransition } from "./policies/campaign.policy";

const CAMPAIGN_WITH_RELATIONS = {
  products: true,
  collections: true,
} satisfies Prisma.CampaignInclude;

type CampaignWithRelations = CampaignModel & {
  products: CampaignProductModel[];
  collections: CampaignCollectionModel[];
};

export interface CouponListResult {
  coupons: CouponSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CampaignListResult {
  campaigns: CampaignSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ValidatedCouponDiscount {
  code: string;
  type: CouponType;
  discountAmount: number;
  message: string;
}

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------
  // Coupons
  // ---------------------------------------------------------------------

  async listCoupons(query: ListCouponsQueryDto): Promise<CouponListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CouponWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.code ? { code: { contains: query.code, mode: "insensitive" } } : {}),
    };

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      coupons: coupons.map((c) => this.toCouponSummary(c)),
      total,
      page,
      pageSize,
    };
  }

  async createCoupon(dto: UpsertCouponDto, adminId: string): Promise<CouponSummary> {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictError("A coupon with this code already exists");

    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minCartValue: dto.minCartValue ?? null,
        maxUses: dto.maxUses ?? null,
        perUserLimit: dto.perUserLimit ?? null,
        combinable: dto.combinable ?? false,
        eligibleCategoryIds: dto.eligibleCategoryIds ?? [],
        eligibleCollectionIds: dto.eligibleCollectionIds ?? [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "CouponCreated",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code, type: coupon.type },
    });

    return this.toCouponSummary(coupon);
  }

  async updateCoupon(id: string, dto: UpdateCouponDto, adminId: string): Promise<CouponSummary> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Coupon not found");

    if (dto.code && dto.code !== existing.code) {
      const collision = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
      if (collision) throw new ConflictError("A coupon with this code already exists");
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minCartValue: dto.minCartValue,
        maxUses: dto.maxUses,
        perUserLimit: dto.perUserLimit,
        combinable: dto.combinable,
        eligibleCategoryIds: dto.eligibleCategoryIds,
        eligibleCollectionIds: dto.eligibleCollectionIds,
        expiresAt: dto.expiresAt === undefined ? undefined : dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "CouponUpdated",
      entityType: "coupon",
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toCouponSummary(coupon);
  }

  async getCoupon(id: string): Promise<CouponSummary> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError("Coupon not found");
    return this.toCouponSummary(coupon);
  }

  async listCouponUsages(couponId: string): Promise<CouponUsageSummary[]> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundError("Coupon not found");

    const usages = await this.prisma.couponUsage.findMany({
      where: { couponId },
      orderBy: { usedAt: "desc" },
      include: { coupon: { select: { code: true } } },
    });

    return usages.map((u) => this.toCouponUsageSummary(u));
  }

  // ---------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------

  async getCampaign(id: string): Promise<CampaignSummary> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError("Campaign not found");
    return this.getCampaignSummary(id);
  }

  async listCampaigns(query: ListCampaignsQueryDto): Promise<CampaignListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CampaignWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: CAMPAIGN_WITH_RELATIONS,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      campaigns: campaigns.map((c) => this.toCampaignSummary(c)),
      total,
      page,
      pageSize,
    };
  }

  async createCampaign(dto: UpsertCampaignDto, adminId: string): Promise<CampaignSummary> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!(startsAt < endsAt)) {
      throw new ValidationError("startsAt must be before endsAt");
    }

    const existingSlug = await this.prisma.campaign.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) throw new ConflictError("A campaign with this slug already exists");

    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        status: "scheduled",
        discountType: dto.discountType ?? null,
        discountValue: dto.discountValue ?? null,
        startsAt,
        endsAt,
        isActive: dto.isActive ?? true,
        products:
          dto.productSkus && dto.productSkus.length > 0
            ? { create: dto.productSkus.map((variantSku) => ({ variantSku })) }
            : undefined,
        collections:
          dto.collectionIds && dto.collectionIds.length > 0
            ? { create: dto.collectionIds.map((collectionId) => ({ collectionId })) }
            : undefined,
      },
      include: CAMPAIGN_WITH_RELATIONS,
    });

    await this.audit.log({
      userId: adminId,
      action: "CampaignCreated",
      entityType: "campaign",
      entityId: campaign.id,
      metadata: { slug: campaign.slug, type: campaign.type },
    });

    return this.toCampaignSummary(campaign);
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto, adminId: string): Promise<CampaignSummary> {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Campaign not found");

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    if (!(startsAt < endsAt)) {
      throw new ValidationError("startsAt must be before endsAt");
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const collision = await this.prisma.campaign.findUnique({ where: { slug: dto.slug } });
      if (collision) throw new ConflictError("A campaign with this slug already exists");
    }

    if (dto.status && dto.status !== existing.status) {
      assertCampaignTransition(existing.status, dto.status);
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        isActive: dto.isActive,
        status: dto.status,
      },
      include: CAMPAIGN_WITH_RELATIONS,
    });

    await this.audit.log({
      userId: adminId,
      action: dto.status && dto.status !== existing.status ? "CampaignStatusChanged" : "CampaignUpdated",
      entityType: "campaign",
      entityId: id,
      metadata: dto.status && dto.status !== existing.status ? { from: existing.status, to: dto.status } : { fields: Object.keys(dto) },
    });

    return this.toCampaignSummary(campaign);
  }

  async attachCampaignProducts(
    campaignId: string,
    dto: AttachCampaignProductsDto,
    adminId: string,
  ): Promise<CampaignSummary> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundError("Campaign not found");

    await this.prisma.$transaction(
      dto.variantSkus.map((variantSku) =>
        this.prisma.campaignProduct.upsert({
          where: { campaignId_variantSku: { campaignId, variantSku } },
          update: {},
          create: { campaignId, variantSku },
        }),
      ),
    );

    await this.audit.log({
      userId: adminId,
      action: "CampaignProductsAttached",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { variantSkus: dto.variantSkus },
    });

    return this.getCampaignSummary(campaignId);
  }

  async detachCampaignProduct(campaignId: string, variantSku: string, adminId: string): Promise<CampaignSummary> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundError("Campaign not found");

    await this.prisma.campaignProduct.deleteMany({ where: { campaignId, variantSku } });

    await this.audit.log({
      userId: adminId,
      action: "CampaignProductDetached",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { variantSku },
    });

    return this.getCampaignSummary(campaignId);
  }

  async attachCampaignCollections(
    campaignId: string,
    dto: AttachCampaignCollectionsDto,
    adminId: string,
  ): Promise<CampaignSummary> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundError("Campaign not found");

    await this.prisma.$transaction(
      dto.collectionIds.map((collectionId) =>
        this.prisma.campaignCollection.upsert({
          where: { campaignId_collectionId: { campaignId, collectionId } },
          update: {},
          create: { campaignId, collectionId },
        }),
      ),
    );

    await this.audit.log({
      userId: adminId,
      action: "CampaignCollectionsAttached",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { collectionIds: dto.collectionIds },
    });

    return this.getCampaignSummary(campaignId);
  }

  async detachCampaignCollection(
    campaignId: string,
    collectionId: string,
    adminId: string,
  ): Promise<CampaignSummary> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundError("Campaign not found");

    await this.prisma.campaignCollection.deleteMany({ where: { campaignId, collectionId } });

    await this.audit.log({
      userId: adminId,
      action: "CampaignCollectionDetached",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { collectionId },
    });

    return this.getCampaignSummary(campaignId);
  }

  // ---------------------------------------------------------------------
  // Public integration surface — for cart/checkout flow (not yet wired up)
  // ---------------------------------------------------------------------

  async validateCouponForUser(
    code: string,
    params: {
      subtotal: number;
      userId?: string;
      sessionId?: string;
      otherAppliedCodes?: string[];
      cartCategoryIds?: string[];
      cartCollectionIds?: string[];
    },
  ): Promise<ValidatedCouponDiscount> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new ValidationError("Invalid coupon code");

    if (!coupon.isActive) {
      throw new ValidationError("This coupon is not active");
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new ValidationError("This coupon has expired");
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new ValidationError("This coupon has reached its usage limit");
    }
    if (coupon.minCartValue !== null && params.subtotal < Number(coupon.minCartValue)) {
      throw new ValidationError(
        `Minimum cart value of ₹${Number(coupon.minCartValue)} required for this coupon`,
      );
    }

    if (coupon.perUserLimit !== null && params.userId) {
      const usageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId: params.userId },
      });
      if (usageCount >= coupon.perUserLimit) {
        throw new ValidationError("You have already used this coupon the maximum number of times");
      }
    }

    if (!coupon.combinable && params.otherAppliedCodes && params.otherAppliedCodes.length > 0) {
      throw new ValidationError("This coupon cannot be combined with other coupons");
    }

    if (coupon.eligibleCategoryIds.length > 0) {
      const cartCategoryIds = params.cartCategoryIds ?? [];
      const hasMatch = cartCategoryIds.some((catId) => coupon.eligibleCategoryIds.includes(catId));
      if (!hasMatch) {
        throw new ValidationError("This coupon does not apply to any items in your cart");
      }
    }

    if (coupon.eligibleCollectionIds.length > 0) {
      const cartCollectionIds = params.cartCollectionIds ?? [];
      const hasMatch = cartCollectionIds.some((colId) => coupon.eligibleCollectionIds.includes(colId));
      if (!hasMatch) {
        throw new ValidationError("This coupon does not apply to any items in your cart");
      }
    }

    let discountAmount = 0;
    let message = "";

    switch (coupon.type) {
      case "percent":
        discountAmount = Math.round(params.subtotal * (Number(coupon.value) / 100));
        message = `${coupon.value}% off applied`;
        break;
      case "fixed":
        discountAmount = Math.min(params.subtotal, Number(coupon.value));
        message = `₹${coupon.value} off applied`;
        break;
      case "free_shipping":
        discountAmount = 0;
        message = "Free shipping applied";
        break;
      default:
        throw new ValidationError("Unsupported coupon type");
    }

    return {
      code: coupon.code,
      type: coupon.type,
      discountAmount,
      message,
    };
  }

  async recordCouponUsage(
    couponId: string,
    params: { userId?: string; sessionId?: string; orderId?: string; discountAmount: number },
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.couponUsage.create({
        data: {
          couponId,
          userId: params.userId,
          sessionId: params.sessionId,
          orderId: params.orderId,
          discountAmount: params.discountAmount,
        },
      }),
      this.prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async getCampaignSummary(id: string): Promise<CampaignSummary> {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: CAMPAIGN_WITH_RELATIONS,
    });
    return this.toCampaignSummary(campaign);
  }

  private toCouponSummary(coupon: CouponModel): CouponSummary {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type as CouponType,
      value: coupon.value.toString(),
      minCartValue: coupon.minCartValue?.toString() ?? null,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      perUserLimit: coupon.perUserLimit,
      combinable: coupon.combinable,
      eligibleCategoryIds: coupon.eligibleCategoryIds,
      eligibleCollectionIds: coupon.eligibleCollectionIds,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt.toISOString(),
    };
  }

  private toCouponUsageSummary(usage: CouponUsageModel & { coupon: { code: string } }): CouponUsageSummary {
    return {
      id: usage.id,
      couponId: usage.couponId,
      couponCode: usage.coupon.code,
      userId: usage.userId,
      orderId: usage.orderId,
      discountAmount: usage.discountAmount.toString(),
      usedAt: usage.usedAt.toISOString(),
    };
  }

  private toCampaignSummary(campaign: CampaignWithRelations): CampaignSummary {
    return {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      type: campaign.type,
      status: campaign.status,
      discountType: campaign.discountType as CouponType | null,
      discountValue: campaign.discountValue?.toString() ?? null,
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      isActive: campaign.isActive,
      productSkus: campaign.products.map((p) => p.variantSku),
      collectionIds: campaign.collections.map((c) => c.collectionId),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }
}
