import type { ApiEnv } from "@ecom/config";
import { ValidationError, defaultSlotConfig, isRecommendationSlot } from "@ecom/shared";
import type {
  PersonalizationProfileSummary,
  ProductSummary,
  RecommendationResult,
  RecommendationSlot,
  RecommendationSlotConfig,
  RecommendationStrategy,
} from "@ecom/types";
import { DEFAULT_RECOMMENDATION_SLOTS } from "@ecom/types";
import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AnalyticsService } from "../analytics/analytics.service";
import { AuditService } from "../audit/audit.service";
import { productInclude, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { APP_ENV } from "../config/config.module";
import { FeatureFlagsService } from "../platform/feature-flags.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

import type { RecommendationEventDto } from "./dto/recommendation-event.dto";
import type { UpdateRecommendationSlotDto } from "./dto/update-slot.dto";

const PAID_NOT_IN = ["pending_payment", "cancelled", "failed"] as const;

type SlotQuery = { productSlug?: string; sessionId?: string; userId?: string };

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly redis: RedisService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
    private readonly analytics: AnalyticsService,
    private readonly audit: AuditService,
  ) {}

  async listPublicSlots(): Promise<RecommendationSlotConfig[]> {
    const rows = await this.prisma.recommendationSlotConfig.findMany({ orderBy: { slot: "asc" } });
    if (rows.length === 0) return DEFAULT_RECOMMENDATION_SLOTS.map((row) => ({ ...row }));
    return rows.filter((row) => row.isEnabled).map((row) => this.toConfig(row));
  }

  async listAdminSlots(): Promise<RecommendationSlotConfig[]> {
    const rows = await this.prisma.recommendationSlotConfig.findMany({ orderBy: { slot: "asc" } });
    if (rows.length === 0) return DEFAULT_RECOMMENDATION_SLOTS.map((row) => ({ ...row }));
    return rows.map((row) => this.toConfig(row));
  }

  async updateSlot(
    actorId: string,
    slot: string,
    dto: UpdateRecommendationSlotDto,
  ): Promise<RecommendationSlotConfig> {
    if (!isRecommendationSlot(slot)) {
      throw new ValidationError(`Unknown recommendation slot: ${slot}`);
    }
    const existing = await this.prisma.recommendationSlotConfig.findUnique({ where: { slot } });
    const defaults = defaultSlotConfig(slot);
    const data = {
      title: dto.title ?? existing?.title ?? defaults.title,
      strategy: dto.strategy ?? existing?.strategy ?? defaults.strategy,
      isEnabled: dto.isEnabled ?? existing?.isEnabled ?? defaults.isEnabled,
      fallbackProductSlugs: dto.fallbackProductSlugs ?? existing?.fallbackProductSlugs ?? defaults.fallbackProductSlugs,
      limit: dto.limit ?? existing?.limit ?? defaults.limit,
    };
    const saved = existing
      ? await this.prisma.recommendationSlotConfig.update({ where: { slot }, data })
      : await this.prisma.recommendationSlotConfig.create({ data: { slot, ...data } });

    await this.audit.log({
      userId: actorId,
      action: "recommendation_slot.updated",
      entityType: "recommendation_slot",
      entityId: saved.id,
      before: existing ? this.toSnapshot(existing) : undefined,
      after: this.toSnapshot(saved),
    });

    return this.toConfig(saved);
  }

  async getSlot(slot: string, query: SlotQuery): Promise<RecommendationResult> {
    if (!isRecommendationSlot(slot)) {
      throw new ValidationError(`Unknown recommendation slot: ${slot}`);
    }

    const cached = await this.readCache(slot, query);
    if (cached) return cached;

    const config = await this.loadConfig(slot);
    const aiEnabled = await this.flags.isEnabled("recommendations.ai");
    let products: ProductSummary[] = [];
    let fallbackUsed = false;
    let reason = this.reasonFor(config.strategy);

    if (!config.isEnabled) {
      products = await this.bySlugs(config.fallbackProductSlugs, config.limit, query.productSlug);
      fallbackUsed = true;
      reason = "Slot disabled; using merchandised fallback products.";
      if (products.length === 0) {
        products = await this.trendingProducts(config.limit, query.productSlug);
      }
    } else {
      products = await this.resolveStrategy(config, query);
      if (products.length === 0 && config.fallbackProductSlugs.length > 0) {
        products = await this.bySlugs(config.fallbackProductSlugs, config.limit, query.productSlug);
        fallbackUsed = true;
        reason = "Rule returned empty; using merchandised fallback products.";
      }
      if (products.length === 0 && config.strategy !== "recently_viewed") {
        products = await this.trendingProducts(config.limit, query.productSlug);
        fallbackUsed = true;
        reason = "No matches; using newest published products.";
      }
    }

    const result: RecommendationResult = {
      slot,
      title: config.title,
      strategy: config.strategy,
      provider: "rules",
      reason: aiEnabled
        ? `${reason} AI flag is on but no model provider is wired.`
        : reason,
      fallbackUsed,
      aiEnabled,
      products,
    };

    await this.writeCache(slot, query, result);
    return result;
  }

  async recordEvent(dto: RecommendationEventDto, userId?: string): Promise<{ accepted: number }> {
    const ingest = await this.analytics.ingest(
      [
        {
          clientEventId: crypto.randomUUID(),
          name: dto.name,
          sessionId: dto.sessionId,
          properties: { slot: dto.slot, productSlug: dto.productSlug ?? null },
        },
      ],
      userId,
      "client",
    );
    return { accepted: ingest.accepted };
  }

  async getProfile(userId: string): Promise<PersonalizationProfileSummary | null> {
    const row = await this.prisma.personalizationProfile.findUnique({ where: { userId } });
    if (!row) return null;
    return {
      subjectType: "user",
      categoryAffinities: this.asAffinities(row.categoryAffinities),
      productAffinities: this.asAffinities(row.productAffinities),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async resolveStrategy(config: RecommendationSlotConfig, query: SlotQuery): Promise<ProductSummary[]> {
    switch (config.strategy) {
      case "similar":
        return this.similarProducts(config.limit, query.productSlug);
      case "complete_the_look":
        return this.sameCollection(config.limit, query.productSlug);
      case "recently_viewed":
        return this.recentlyViewedProducts(config.limit, query.userId, query.sessionId);
      case "frequently_bought":
        return this.frequentlyBought(config.limit, query.productSlug);
      default:
        return this.trendingProducts(config.limit, query.productSlug);
    }
  }

  private async trendingProducts(limit: number, excludeSlug?: string): Promise<ProductSummary[]> {
    const products = await this.prisma.product.findMany({
      where: { status: "published", ...(excludeSlug ? { slug: { not: excludeSlug } } : {}) },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: productInclude,
    });
    return products.map(toProductSummary);
  }

  private async similarProducts(limit: number, productSlug?: string): Promise<ProductSummary[]> {
    if (!productSlug) return this.trendingProducts(limit);
    const current = await this.prisma.product.findFirst({
      where: { slug: productSlug, status: "published" },
      include: { categories: true },
    });
    const categoryIds = current?.categories.map((row) => row.categoryId) ?? [];
    if (categoryIds.length === 0) return this.trendingProducts(limit, productSlug);
    const products = await this.prisma.product.findMany({
      where: {
        status: "published",
        slug: { not: productSlug },
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: productInclude,
    });
    return products.map(toProductSummary);
  }

  private async sameCollection(limit: number, productSlug?: string): Promise<ProductSummary[]> {
    if (!productSlug) return this.trendingProducts(limit);
    const current = await this.prisma.product.findFirst({
      where: { slug: productSlug, status: "published" },
      include: { collections: true },
    });
    const collectionIds = current?.collections.map((row) => row.collectionId) ?? [];
    if (collectionIds.length === 0) return this.similarProducts(limit, productSlug);
    const products = await this.prisma.product.findMany({
      where: {
        status: "published",
        slug: { not: productSlug },
        collections: { some: { collectionId: { in: collectionIds } } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: productInclude,
    });
    return products.map(toProductSummary);
  }

  private async recentlyViewedProducts(
    limit: number,
    userId?: string,
    sessionId?: string,
  ): Promise<ProductSummary[]> {
    if (!userId && !sessionId) return [];
    const rows = await this.prisma.recentlyViewed.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { viewedAt: "desc" },
      take: limit,
    });
    return this.bySlugs(
      rows.map((row) => row.productSlug),
      limit,
    );
  }

  private async frequentlyBought(limit: number, productSlug?: string): Promise<ProductSummary[]> {
    if (!productSlug) return this.trendingProducts(limit);
    const variants = await this.prisma.productVariant.findMany({
      where: { product: { slug: productSlug } },
      select: { sku: true },
    });
    const selfSkus = new Set(variants.map((row) => row.sku));
    if (selfSkus.size === 0) return this.similarProducts(limit, productSlug);

    const orders = await this.prisma.order.findMany({
      where: { status: { notIn: [...PAID_NOT_IN] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { lineItems: true },
    });

    const counts = new Map<string, number>();
    for (const order of orders) {
      const items = Array.isArray(order.lineItems) ? order.lineItems : [];
      const skus = items.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const sku = (item as { variantSku?: unknown }).variantSku;
        return typeof sku === "string" ? [sku] : [];
      });
      if (!skus.some((sku) => selfSkus.has(sku))) continue;
      for (const sku of skus) {
        if (selfSkus.has(sku)) continue;
        counts.set(sku, (counts.get(sku) ?? 0) + 1);
      }
    }

    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (ranked.length === 0) return this.similarProducts(limit, productSlug);

    const related = await this.prisma.productVariant.findMany({
      where: { sku: { in: ranked.map(([sku]) => sku) } },
      select: { sku: true, product: { select: { slug: true } } },
    });
    const slugs = related.map((row) => row.product.slug).filter((slug) => slug !== productSlug);
    return this.bySlugs(slugs, limit, productSlug);
  }

  private async bySlugs(slugs: string[], limit: number, excludeSlug?: string): Promise<ProductSummary[]> {
    const unique = [...new Set(slugs.filter((slug) => slug && slug !== excludeSlug))].slice(0, limit);
    if (unique.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: { slug: { in: unique }, status: "published" },
      include: productInclude,
    });
    const map = new Map(products.map((product) => [product.slug, toProductSummary(product)]));
    return unique.flatMap((slug) => {
      const product = map.get(slug);
      return product ? [product] : [];
    });
  }

  private async loadConfig(slot: RecommendationSlot): Promise<RecommendationSlotConfig> {
    const row = await this.prisma.recommendationSlotConfig.findUnique({ where: { slot } });
    return row ? this.toConfig(row) : defaultSlotConfig(slot);
  }

  private toConfig(row: {
    slot: string;
    title: string;
    strategy: string;
    isEnabled: boolean;
    fallbackProductSlugs: string[];
    limit: number;
  }): RecommendationSlotConfig {
    const slot = isRecommendationSlot(row.slot) ? row.slot : "homepage_trending";
    const strategy = (["trending", "similar", "recently_viewed", "frequently_bought", "complete_the_look"] as const)
      .includes(row.strategy as RecommendationStrategy)
      ? (row.strategy as RecommendationStrategy)
      : "trending";
    return {
      slot,
      title: row.title,
      strategy,
      isEnabled: row.isEnabled,
      fallbackProductSlugs: row.fallbackProductSlugs,
      limit: row.limit,
    };
  }

  private toSnapshot(row: {
    slot: string;
    title: string;
    strategy: string;
    isEnabled: boolean;
    fallbackProductSlugs: string[];
    limit: number;
  }): Prisma.InputJsonValue {
    return {
      slot: row.slot,
      title: row.title,
      strategy: row.strategy,
      isEnabled: row.isEnabled,
      fallbackProductSlugs: row.fallbackProductSlugs,
      limit: row.limit,
    };
  }

  private reasonFor(strategy: RecommendationStrategy): string {
    switch (strategy) {
      case "similar":
        return "Same-category published products (rule-based similar).";
      case "complete_the_look":
        return "Same-collection published products (complete the look).";
      case "recently_viewed":
        return "Recently viewed (deterministic; not a model score).";
      case "frequently_bought":
        return "Co-purchased SKUs from paid orders (market-basket heuristic).";
      default:
        return "Newest published products (rule-based trending).";
    }
  }

  private cacheKey(slot: string, query: SlotQuery): string {
    return `rec:v1:${slot}:${query.productSlug ?? "_"}:${query.userId ?? query.sessionId ?? "anon"}`;
  }

  private async readCache(slot: string, query: SlotQuery): Promise<RecommendationResult | null> {
    try {
      const raw = await this.redis.get(this.cacheKey(slot, query));
      if (!raw) return null;
      return JSON.parse(raw) as RecommendationResult;
    } catch {
      return null;
    }
  }

  private async writeCache(slot: string, query: SlotQuery, result: RecommendationResult): Promise<void> {
    try {
      await this.redis.setex(
        this.cacheKey(slot, query),
        this.env.RECOMMENDATION_CACHE_TTL_SECONDS,
        JSON.stringify(result),
      );
    } catch {
      // Redis is optional in local dev.
    }
  }

  private asAffinities(value: Prisma.JsonValue): { slug: string; score: number }[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const slug = (entry as { slug?: unknown }).slug;
      const score = (entry as { score?: unknown }).score;
      if (typeof slug !== "string" || typeof score !== "number") return [];
      return [{ slug, score }];
    });
  }
}
