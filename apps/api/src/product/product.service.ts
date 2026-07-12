import type {
  PdpHighlight,
  PdpProduct,
  ProductReview,
  ProductSummary,
  ReviewSummary,
} from "@ecom/types";
import { NotFoundError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";

import { CatalogService } from "../catalog/catalog.service";
import { productInclude, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
  ) {}

  async getPdp(slug: string): Promise<PdpProduct> {
    const product = await this.catalogService.getPublishedProductBySlug(slug);
    const dbProduct = await this.prisma.product.findFirstOrThrow({
      where: { slug, status: "published" },
      select: { id: true, categories: { select: { categoryId: true } }, collections: { select: { collectionId: true } } },
    });

    const [reviewSummary, relatedProducts] = await Promise.all([
      this.buildReviewSummary(dbProduct.id),
      this.getRelatedProducts(slug, dbProduct.categories.map((c) => c.categoryId), dbProduct.collections.map((c) => c.collectionId)),
    ]);

    return {
      ...product,
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

    return products.map(toProductSummary);
  }
}
