import { NotFoundError, ValidationError } from "@ecom/shared";
import type {
  PriceHistoryEntry,
  PriceListSummary,
  PriceSimulationInput,
  PriceSimulationResult,
  ProductPriceSummary,
  TaxRuleSummary,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";
import type { Coupon, Prisma, PriceList, PriceHistory as PriceHistoryModel, ProductPrice, TaxRule } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { CreatePriceListDto } from "./dto/create-price-list.dto";
import type { ListPricesQueryDto } from "./dto/list-prices-query.dto";
import type { UpsertProductPriceDto } from "./dto/upsert-product-price.dto";
import type { UpdateTaxRuleDto, UpsertTaxRuleDto } from "./dto/upsert-tax-rule.dto";
import { resolveEffectivePrice, resolveTaxRate } from "./policies/price-resolution.policy";

export interface PriceListingResult {
  prices: ProductPriceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ResolvedEffectivePrice {
  mrp: string;
  sellingPrice: string;
  salePrice: string | null;
  effectivePrice: string;
  saleActive: boolean;
}

function roundMoney(value: number): string {
  return value.toFixed(2);
}

type TaxRuleWithCategory = TaxRule & { category: { id: string; name: string } | null };

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------
  // Price lists
  // ---------------------------------------------------------------------

  async listPriceLists(): Promise<PriceListSummary[]> {
    const priceLists = await this.prisma.priceList.findMany({ orderBy: { createdAt: "asc" } });
    return priceLists.map((list) => this.toPriceListSummary(list));
  }

  async createPriceList(dto: CreatePriceListDto, adminId: string): Promise<PriceListSummary> {
    const priceList = await this.prisma.priceList.create({
      data: {
        code: dto.code,
        name: dto.name,
        currency: dto.currency ?? "INR",
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "PriceListCreated",
      entityType: "price_list",
      entityId: priceList.id,
      metadata: { code: priceList.code },
    });

    return this.toPriceListSummary(priceList);
  }

  // ---------------------------------------------------------------------
  // Prices
  // ---------------------------------------------------------------------

  async listPrices(query: ListPricesQueryDto): Promise<PriceListingResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ProductPriceWhereInput = {
      ...(query.priceListId ? { priceListId: query.priceListId } : {}),
      ...(query.variantSku ? { variantSku: query.variantSku } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.productPrice.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.productPrice.count({ where }),
    ]);

    return {
      prices: rows.map((row) => this.toProductPriceSummary(row)),
      total,
      page,
      pageSize,
    };
  }

  async upsertPrice(variantSku: string, dto: UpsertProductPriceDto, adminId: string): Promise<ProductPriceSummary> {
    this.assertValidSalePrice(dto.mrp, dto.sellingPrice, dto.salePrice);
    this.assertValidSaleWindow(dto.saleStartsAt, dto.saleEndsAt);

    const priceListId = dto.priceListId ?? (await this.getDefaultPriceListId());
    if (!priceListId) {
      throw new NotFoundError("No default price list configured — create one first or pass priceListId explicitly");
    }

    const existing = await this.prisma.productPrice.findUnique({
      where: { priceListId_variantSku: { priceListId, variantSku } },
    });

    const saleStartsAt = dto.saleStartsAt === undefined ? undefined : dto.saleStartsAt ? new Date(dto.saleStartsAt) : null;
    const saleEndsAt = dto.saleEndsAt === undefined ? undefined : dto.saleEndsAt ? new Date(dto.saleEndsAt) : null;

    const saved = existing
      ? await this.prisma.productPrice.update({
          where: { id: existing.id },
          data: {
            mrp: dto.mrp,
            sellingPrice: dto.sellingPrice,
            ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
            ...(saleStartsAt !== undefined ? { saleStartsAt } : {}),
            ...(saleEndsAt !== undefined ? { saleEndsAt } : {}),
          },
        })
      : await this.prisma.productPrice.create({
          data: {
            priceListId,
            variantSku,
            mrp: dto.mrp,
            sellingPrice: dto.sellingPrice,
            salePrice: dto.salePrice ?? null,
            saleStartsAt: saleStartsAt ?? null,
            saleEndsAt: saleEndsAt ?? null,
          },
        });

    await this.prisma.priceHistory.create({
      data: {
        productPriceId: saved.id,
        variantSku,
        oldMrp: existing?.mrp ?? null,
        newMrp: saved.mrp,
        oldSellingPrice: existing?.sellingPrice ?? null,
        newSellingPrice: saved.sellingPrice,
        reason: dto.reason,
        changedBy: adminId,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: existing ? "ProductPriceUpdated" : "ProductPriceCreated",
      entityType: "product_price",
      entityId: saved.id,
      metadata: { variantSku, priceListId, reason: dto.reason },
    });

    return this.toProductPriceSummary(saved);
  }

  async getPriceHistory(variantSku: string): Promise<PriceHistoryEntry[]> {
    const entries = await this.prisma.priceHistory.findMany({
      where: { variantSku },
      orderBy: { createdAt: "desc" },
    });
    return entries.map((entry) => this.toPriceHistoryEntry(entry));
  }

  // ---------------------------------------------------------------------
  // Tax rules
  // ---------------------------------------------------------------------

  async listTaxRules(): Promise<TaxRuleSummary[]> {
    const rules = await this.prisma.taxRule.findMany({
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
    return rules.map((rule) => this.toTaxRuleSummary(rule));
  }

  async createTaxRule(dto: UpsertTaxRuleDto, adminId: string): Promise<TaxRuleSummary> {
    const rule = await this.prisma.taxRule.create({
      data: {
        name: dto.name,
        rate: dto.rate,
        appliesTo: dto.appliesTo ?? "all",
        categoryId: dto.categoryId ?? null,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    await this.audit.log({
      userId: adminId,
      action: "TaxRuleCreated",
      entityType: "tax_rule",
      entityId: rule.id,
      metadata: { name: rule.name, rate: rule.rate.toString() },
    });

    return this.toTaxRuleSummary(rule);
  }

  async updateTaxRule(id: string, dto: UpdateTaxRuleDto, adminId: string): Promise<TaxRuleSummary> {
    const existing = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Tax rule not found");

    const rule = await this.prisma.taxRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.rate !== undefined ? { rate: dto.rate } : {}),
        ...(dto.appliesTo !== undefined ? { appliesTo: dto.appliesTo } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    await this.audit.log({
      userId: adminId,
      action: "TaxRuleUpdated",
      entityType: "tax_rule",
      entityId: rule.id,
      metadata: { changes: { ...dto } as Prisma.InputJsonValue },
    });

    return this.toTaxRuleSummary(rule);
  }

  // ---------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------

  async simulate(dto: PriceSimulationInput): Promise<PriceSimulationResult> {
    const quantity = dto.quantity ?? 1;

    const { priceInfo, categoryId } = await this.resolveVariantPricingAndCategory(dto.variantSku);

    const subtotal = Number(priceInfo.effectivePrice) * quantity;

    const taxRules = await this.prisma.taxRule.findMany({ where: { isActive: true } });
    const taxRate = resolveTaxRate(
      taxRules.map((rule) => ({
        rate: rule.rate.toString(),
        categoryId: rule.categoryId,
        priority: rule.priority,
        isActive: rule.isActive,
      })),
      categoryId,
    );
    const taxAmount = subtotal * taxRate;

    let discount = 0;
    let couponApplied: string | null = null;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      discount = this.applyCoupon(coupon, dto.couponCode, subtotal);
      couponApplied = dto.couponCode;
    }

    const total = subtotal - discount + taxAmount;

    return {
      variantSku: dto.variantSku,
      mrp: priceInfo.mrp,
      sellingPrice: priceInfo.sellingPrice,
      effectivePrice: priceInfo.effectivePrice,
      quantity,
      subtotal: roundMoney(subtotal),
      discount: roundMoney(discount),
      taxRate: taxRate.toString(),
      taxAmount: roundMoney(taxAmount),
      total: roundMoney(total),
      couponApplied,
    };
  }

  /**
   * Public integration point for other teams (e.g. cart/checkout) to resolve
   * the current effective price for a variant. Not wired up anywhere yet.
   */
  async getEffectivePrice(variantSku: string, priceListId?: string): Promise<ResolvedEffectivePrice | null> {
    const resolvedPriceListId = priceListId ?? (await this.getDefaultPriceListId());
    if (!resolvedPriceListId) return null;

    const row = await this.prisma.productPrice.findUnique({
      where: { priceListId_variantSku: { priceListId: resolvedPriceListId, variantSku } },
    });
    if (!row) return null;

    const { effectivePrice, saleActive } = resolveEffectivePrice(row);
    return {
      mrp: row.mrp.toString(),
      sellingPrice: row.sellingPrice.toString(),
      salePrice: row.salePrice?.toString() ?? null,
      effectivePrice,
      saleActive,
    };
  }

  /**
   * Batched sibling of `getEffectivePrice` for customer-facing catalog surfaces
   * (PLP/PDP) that need pricing for many variants at once. Only scoped to the
   * default price list — same scoping `getEffectivePrice` falls back to when no
   * explicit `priceListId` is passed. SKUs without a `ProductPrice` row are
   * simply absent from the returned map; callers should fall back to the
   * variant's own `price` field (same pattern as `cart.service.ts`'s `enrichItems`).
   */
  async getEffectivePricesForSkus(variantSkus: string[]): Promise<Map<string, ResolvedEffectivePrice>> {
    const result = new Map<string, ResolvedEffectivePrice>();
    if (variantSkus.length === 0) return result;

    const rows = await this.prisma.productPrice.findMany({
      where: { variantSku: { in: variantSkus }, priceList: { isDefault: true } },
    });

    for (const row of rows) {
      const { effectivePrice, saleActive } = resolveEffectivePrice(row);
      result.set(row.variantSku, {
        mrp: row.mrp.toString(),
        sellingPrice: row.sellingPrice.toString(),
        salePrice: row.salePrice?.toString() ?? null,
        effectivePrice,
        saleActive,
      });
    }

    return result;
  }

  /**
   * Best-effort campaign badge lookup for customer-facing catalog surfaces.
   * A SKU is "covered" either by a direct `CampaignProduct` attachment, or by
   * belonging to a collection attached to a campaign via `CampaignCollection`
   * — callers supply `collectionIdsBySku` (the collection ids each product's
   * SKU belongs to) since that mapping lives in the catalog domain, not pricing.
   * Only `status: "active"` campaigns are considered "live".
   */
  async getCampaignBadgesForSkus(
    variantSkus: string[],
    collectionIdsBySku: Map<string, string[]> = new Map(),
  ): Promise<Map<string, string>> {
    const badges = new Map<string, string>();
    if (variantSkus.length === 0) return badges;

    const allCollectionIds = [...new Set([...collectionIdsBySku.values()].flat())];

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: "active",
        OR: [
          { products: { some: { variantSku: { in: variantSkus } } } },
          ...(allCollectionIds.length
            ? [{ collections: { some: { collectionId: { in: allCollectionIds } } } }]
            : []),
        ],
      },
      include: { products: true, collections: true },
    });
    if (campaigns.length === 0) return badges;

    for (const sku of variantSkus) {
      const skuCollectionIds = collectionIdsBySku.get(sku) ?? [];
      const matched = campaigns.find(
        (campaign) =>
          campaign.products.some((p) => p.variantSku === sku) ||
          campaign.collections.some((c) => skuCollectionIds.includes(c.collectionId)),
      );
      if (matched) {
        badges.set(sku, this.formatCampaignBadge(matched));
      }
    }

    return badges;
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private applyCoupon(coupon: Coupon | null, code: string, subtotal: number): number {
    if (!coupon || !coupon.isActive || (coupon.expiresAt && coupon.expiresAt < new Date())) {
      throw new ValidationError(`Coupon "${code}" is invalid or has expired`);
    }

    if (coupon.type === "free_shipping") {
      return 0;
    }

    const value = Number(coupon.value);
    const roundToTwo = (n: number) => Math.round(n * 100) / 100;

    if (coupon.type === "percent") {
      return Math.min(subtotal, roundToTwo(subtotal * (value / 100)));
    }
    // fixed
    return Math.min(subtotal, roundToTwo(value));
  }

  private async resolveVariantPricingAndCategory(
    variantSku: string,
  ): Promise<{ priceInfo: ResolvedEffectivePrice; categoryId: string | null }> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { sku: variantSku },
      include: {
        product: {
          include: { categories: { include: { category: true }, take: 1 } },
        },
      },
    });
    if (!variant) throw new NotFoundError("Variant not found");

    const categoryId = variant.product.categories[0]?.categoryId ?? null;

    const defaultPriceListId = await this.getDefaultPriceListId();
    const productPrice = defaultPriceListId
      ? await this.prisma.productPrice.findUnique({
          where: { priceListId_variantSku: { priceListId: defaultPriceListId, variantSku } },
        })
      : null;

    if (productPrice) {
      const { effectivePrice, saleActive } = resolveEffectivePrice(productPrice);
      return {
        priceInfo: {
          mrp: productPrice.mrp.toString(),
          sellingPrice: productPrice.sellingPrice.toString(),
          salePrice: productPrice.salePrice?.toString() ?? null,
          effectivePrice,
          saleActive,
        },
        categoryId,
      };
    }

    const fallbackMrp = (variant.compareAtPrice ?? variant.price).toString();
    const fallbackSellingPrice = variant.price.toString();
    return {
      priceInfo: {
        mrp: fallbackMrp,
        sellingPrice: fallbackSellingPrice,
        salePrice: null,
        effectivePrice: fallbackSellingPrice,
        saleActive: false,
      },
      categoryId,
    };
  }

  private async getDefaultPriceListId(): Promise<string | null> {
    const list = await this.prisma.priceList.findFirst({ where: { isDefault: true } });
    return list?.id ?? null;
  }

  private assertValidSalePrice(mrp: string, sellingPrice: string, salePrice: string | null | undefined): void {
    if (salePrice === undefined || salePrice === null) return;
    if (Number(salePrice) >= Number(sellingPrice)) {
      throw new ValidationError("salePrice must be less than sellingPrice");
    }
  }

  private assertValidSaleWindow(
    saleStartsAt: string | null | undefined,
    saleEndsAt: string | null | undefined,
  ): void {
    if (!saleStartsAt || !saleEndsAt) return;
    if (new Date(saleStartsAt) >= new Date(saleEndsAt)) {
      throw new ValidationError("saleStartsAt must be before saleEndsAt");
    }
  }

  private formatCampaignBadge(campaign: { name: string; discountType: string | null; discountValue: Prisma.Decimal | null }): string {
    if (campaign.discountType === "percent" && campaign.discountValue) {
      return `${Number(campaign.discountValue)}% OFF`;
    }
    if (campaign.discountValue) {
      return "Sale";
    }
    return campaign.name;
  }

  private toPriceListSummary(list: PriceList): PriceListSummary {
    return {
      id: list.id,
      code: list.code,
      name: list.name,
      currency: list.currency,
      isDefault: list.isDefault,
      isActive: list.isActive,
      createdAt: list.createdAt.toISOString(),
    };
  }

  private toProductPriceSummary(row: ProductPrice): ProductPriceSummary {
    const { effectivePrice, saleActive } = resolveEffectivePrice(row);
    return {
      id: row.id,
      priceListId: row.priceListId,
      variantSku: row.variantSku,
      mrp: row.mrp.toString(),
      sellingPrice: row.sellingPrice.toString(),
      salePrice: row.salePrice?.toString() ?? null,
      saleStartsAt: row.saleStartsAt?.toISOString() ?? null,
      saleEndsAt: row.saleEndsAt?.toISOString() ?? null,
      saleActive,
      effectivePrice,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPriceHistoryEntry(entry: PriceHistoryModel): PriceHistoryEntry {
    return {
      id: entry.id,
      variantSku: entry.variantSku,
      oldMrp: entry.oldMrp?.toString() ?? null,
      newMrp: entry.newMrp.toString(),
      oldSellingPrice: entry.oldSellingPrice?.toString() ?? null,
      newSellingPrice: entry.newSellingPrice.toString(),
      reason: entry.reason,
      changedBy: entry.changedBy,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  private toTaxRuleSummary(rule: TaxRuleWithCategory): TaxRuleSummary {
    return {
      id: rule.id,
      name: rule.name,
      rate: rule.rate.toString(),
      appliesTo: rule.appliesTo,
      categoryId: rule.categoryId,
      categoryName: rule.category?.name ?? null,
      isActive: rule.isActive,
      priority: rule.priority,
      createdAt: rule.createdAt.toISOString(),
    };
  }
}
