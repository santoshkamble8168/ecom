import type {
  PdpHighlight,
  PdpProduct,
  ProductDetail,
  ProductReview,
  ProductSummary,
  ReviewSummary,
} from "@ecom/types";
import { NotFoundError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";

import { CatalogService } from "../catalog/catalog.service";
import { productInclude, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { PricingService } from "../pricing/pricing.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
    private readonly pricingService: PricingService,
  ) {}

  async getPdp(slug: string): Promise<PdpProduct> {
    const product = await this.catalogService.getPublishedProductBySlug(slug);
    const dbProduct = await this.prisma.product.findFirstOrThrow({
      where: { slug, status: "published" },
      select: { id: true, categories: { select: { categoryId: true } }, collections: { select: { collectionId: true } } },
    });
    const collectionIds = dbProduct.collections.map((c) => c.collectionId);

    const [reviewSummary, relatedProducts, enrichedProduct] = await Promise.all([
      this.buildReviewSummary(dbProduct.id),
      this.getRelatedProducts(slug, dbProduct.categories.map((c) => c.categoryId), collectionIds),
      this.enrichProductWithPricing(product, collectionIds),
    ]);

    return {
      ...enrichedProduct,
      reviewSummary,
      highlights: this.buildHighlights(product),
      relatedProducts,
      inStock: product.variants.some((variant) => variant.isActive),
    };
  }

  async listReviews(slug: string, page = 1, pageSize = 10): Promise<{ items: ProductReview[]; total: number }> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: "published" },
      select: { id: true },
    });
    if (!product) throw new NotFoundError("Product not found");

    const where = { productId: product.id, status: "published" as const };
    const [total, reviews] = await Promise.all([
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.findMany({
        where,
        include: { user: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      items: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        isVerifiedPurchase: review.isVerifiedPurchase,
        authorName: review.user?.displayName ?? review.user?.email?.split("@")[0] ?? "Customer",
        createdAt: review.createdAt.toISOString(),
      })),
    };
  }

  private async buildReviewSummary(productId: string): Promise<ReviewSummary> {
    const reviews = await this.prisma.productReview.findMany({
      where: { productId, status: "published" },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return { averageRating: 0, totalReviews: 0, ratingBreakdown: {} };
    }

    const ratingBreakdown: Record<string, number> = {};
    let sum = 0;
    for (const review of reviews) {
      sum += review.rating;
      const key = String(review.rating);
      ratingBreakdown[key] = (ratingBreakdown[key] ?? 0) + 1;
    }

    return {
      averageRating: Math.round((sum / reviews.length) * 10) / 10,
      totalReviews: reviews.length,
      ratingBreakdown,
    };
  }

  private buildHighlights(product: Awaited<ReturnType<CatalogService["getPublishedProductBySlug"]>>): PdpHighlight[] {
    const highlights: PdpHighlight[] = [
      { label: "Brand", value: product.brand ?? "ECOM" },
      { label: "Fit", value: "Regular fit" },
      { label: "Fabric", value: "100% Cotton" },
      { label: "Care", value: "Machine wash cold" },
    ];
    if (product.tags.length > 0) {
      highlights.push({ label: "Style", value: product.tags.map((t) => t.name).join(", ") });
    }
    return highlights;
  }

  /**
   * Batch lookup of published product summaries by variant SKU (e.g. for
   * blog "related products" strips). Skips unknown/unpublished SKUs rather
   * than erroring, and de-dupes by product so a product with multiple
   * matching SKUs is only returned once.
   */
  async getSummariesBySkus(skus: string[]): Promise<ProductSummary[]> {
    const uniqueSkus = [...new Set(skus)].filter(Boolean);
    if (uniqueSkus.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: {
        status: "published",
        variants: { some: { sku: { in: uniqueSkus } } },
      },
      include: productInclude,
      take: 50,
    });

    const summaries = products.map(toProductSummary);
    return this.enrichSummariesWithPricing(products, summaries);
  }

  private async getRelatedProducts(
    slug: string,
    categoryIds: string[],
    collectionIds: string[],
  ): Promise<ProductSummary[]> {
    const products = await this.prisma.product.findMany({
      where: {
        status: "published",
        slug: { not: slug },
        OR: [
          ...(categoryIds.length ? [{ categories: { some: { categoryId: { in: categoryIds } } } }] : []),
          ...(collectionIds.length ? [{ collections: { some: { collectionId: { in: collectionIds } } } }] : []),
        ],
      },
      include: productInclude,
      take: 4,
      orderBy: { updatedAt: "desc" },
    });

    const summaries = products.map(toProductSummary);
    return this.enrichSummariesWithPricing(products, summaries);
  }

  /**
   * Sprint 10 pricing enrichment for the PDP (additive, best-effort). Enriches
   * every variant (not just the default one, unlike PLP summaries) plus the
   * top-level `effectivePrice`/`saleActive`/`campaignBadge` mirrors of the
   * default (first) variant. Never throws — falls back to the unenriched
   * product so a pricing lookup failure never breaks the PDP.
   */
  private async enrichProductWithPricing(product: ProductDetail, collectionIds: string[]): Promise<ProductDetail> {
    try {
      const skus = [...new Set(product.variants.map((v) => v.sku))];
      if (skus.length === 0) return product;

      const collectionIdsBySku = new Map(skus.map((sku) => [sku, collectionIds]));

      const [priceMap, badgeMap] = await Promise.all([
        this.pricingService.getEffectivePricesForSkus(skus),
        this.pricingService.getCampaignBadgesForSkus(skus, collectionIdsBySku),
      ]);

      const variants = product.variants.map((variant) => {
        const price = priceMap.get(variant.sku);
        return price ? { ...variant, effectivePrice: price.effectivePrice, saleActive: price.saleActive } : variant;
      });

      const defaultSku = product.variants[0]?.sku;
      const defaultPrice = defaultSku ? priceMap.get(defaultSku) : undefined;
      const defaultBadge = defaultSku ? badgeMap.get(defaultSku) : undefined;

      return {
        ...product,
        variants,
        ...(defaultPrice ? { effectivePrice: defaultPrice.effectivePrice, saleActive: defaultPrice.saleActive } : {}),
        ...(defaultBadge !== undefined ? { campaignBadge: defaultBadge } : {}),
      };
    } catch (error) {
      console.error(`[ProductService] Pricing enrichment failed for "${product.slug}":`, error);
      return product;
    }
  }

  /** Sprint 10 pricing enrichment for related-product summaries (PLP-style, default variant only). */
  private async enrichSummariesWithPricing(
    products: Parameters<typeof toProductSummary>[0][],
    summaries: ProductSummary[],
  ): Promise<ProductSummary[]> {
    try {
      const defaultSkus = products.map((p) => p.variants[0]?.sku);
      const skus = [...new Set(defaultSkus.filter((sku): sku is string => !!sku))];
      if (skus.length === 0) return summaries;

      const collectionIdsBySku = new Map<string, string[]>();
      products.forEach((p, i) => {
        const sku = defaultSkus[i];
        if (sku) collectionIdsBySku.set(sku, p.collections.map((c) => c.collection.id));
      });

      const [priceMap, badgeMap] = await Promise.all([
        this.pricingService.getEffectivePricesForSkus(skus),
        this.pricingService.getCampaignBadgesForSkus(skus, collectionIdsBySku),
      ]);

      return summaries.map((summary, i) => {
        const sku = defaultSkus[i];
        if (!sku) return summary;
        const price = priceMap.get(sku);
        const badge = badgeMap.get(sku);
        return {
          ...summary,
          ...(price ? { effectivePrice: price.effectivePrice, saleActive: price.saleActive } : {}),
          ...(badge !== undefined ? { campaignBadge: badge } : {}),
        };
      });
    } catch (error) {
      console.error("[ProductService] Related product pricing enrichment failed:", error);
      return summaries;
    }
  }
}
