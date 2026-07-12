import type { RecentlyViewedItem, WishlistItem } from "@ecom/types";
import { NotFoundError, ValidationError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";

import { productInclude, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { PrismaService } from "../prisma/prisma.service";

const MAX_RECENT = 12;

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId?: string, sessionId?: string): Promise<WishlistItem[]> {
    if (!userId && !sessionId) return [];

    const items = await this.prisma.wishlistItem.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { createdAt: "desc" },
    });

    return this.enrichItems(items);
  }

  async add(params: {
    productSlug: string;
    variantSku?: string;
    userId?: string;
    sessionId?: string;
  }): Promise<WishlistItem> {
    if (!params.userId && !params.sessionId) {
      throw new ValidationError("sessionId is required for guest wishlist");
    }

    const product = await this.prisma.product.findFirst({
      where: { slug: params.productSlug, status: "published" },
    });
    if (!product) throw new NotFoundError("Product not found");

    const item = await this.prisma.wishlistItem.upsert({
      where: params.userId
        ? { userId_productSlug: { userId: params.userId, productSlug: params.productSlug } }
        : { sessionId_productSlug: { sessionId: params.sessionId!, productSlug: params.productSlug } },
      update: { variantSku: params.variantSku ?? null },
      create: {
        userId: params.userId,
        sessionId: params.sessionId,
        productSlug: params.productSlug,
        variantSku: params.variantSku,
      },
    });

    const [enriched] = await this.enrichItems([item]);
    if (!enriched) throw new NotFoundError("Wishlist item not found");
    return enriched;
  }

  async remove(id: string, userId?: string, sessionId?: string): Promise<void> {
    const item = await this.prisma.wishlistItem.findFirst({
      where: {
        id,
        ...(userId ? { userId } : { sessionId }),
      },
    });
    if (!item) throw new NotFoundError("Wishlist item not found");
    await this.prisma.wishlistItem.delete({ where: { id } });
  }

  async isWishlisted(productSlug: string, userId?: string, sessionId?: string): Promise<boolean> {
    if (!userId && !sessionId) return false;
    const count = await this.prisma.wishlistItem.count({
      where: {
        productSlug,
        ...(userId ? { userId } : { sessionId }),
      },
    });
    return count > 0;
  }

  private async enrichItems(
    items: Array<{ id: string; productSlug: string; variantSku: string | null; createdAt: Date }>,
  ): Promise<WishlistItem[]> {
    const slugs = [...new Set(items.map((i) => i.productSlug))];
    const products = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, status: "published" },
      include: productInclude,
    });
    const productMap = new Map(products.map((p) => [p.slug, toProductSummary(p)]));

    return items.map((item) => ({
      id: item.id,
      productSlug: item.productSlug,
      variantSku: item.variantSku,
      product: productMap.get(item.productSlug) ?? null,
      createdAt: item.createdAt.toISOString(),
    }));
  }
}

@Injectable()
export class RecentlyViewedService {
  constructor(private readonly prisma: PrismaService) {}

  async track(productSlug: string, userId?: string, sessionId?: string): Promise<void> {
    if (!userId && !sessionId) return;

    const product = await this.prisma.product.findFirst({
      where: { slug: productSlug, status: "published" },
      select: { slug: true },
    });
    if (!product) return;

    const existing = await this.prisma.recentlyViewed.findFirst({
      where: {
        productSlug,
        ...(userId ? { userId } : { sessionId }),
      },
    });

    if (existing) {
      await this.prisma.recentlyViewed.update({
        where: { id: existing.id },
        data: { viewedAt: new Date() },
      });
    } else {
      await this.prisma.recentlyViewed.create({
        data: { userId, sessionId, productSlug },
      });
    }

    await this.trim(userId, sessionId);
  }

  async list(userId?: string, sessionId?: string): Promise<RecentlyViewedItem[]> {
    if (!userId && !sessionId) return [];

    const items = await this.prisma.recentlyViewed.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { viewedAt: "desc" },
      take: MAX_RECENT,
    });

    const slugs = items.map((i) => i.productSlug);
    const products = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, status: "published" },
      include: productInclude,
    });
    const productMap = new Map(products.map((p) => [p.slug, toProductSummary(p)]));

    return items.map((item) => ({
      productSlug: item.productSlug,
      viewedAt: item.viewedAt.toISOString(),
      product: productMap.get(item.productSlug) ?? null,
    }));
  }

  private async trim(userId?: string, sessionId?: string): Promise<void> {
    const items = await this.prisma.recentlyViewed.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { viewedAt: "desc" },
      select: { id: true },
    });
    if (items.length <= MAX_RECENT) return;
    const toDelete = items.slice(MAX_RECENT).map((i) => i.id);
    await this.prisma.recentlyViewed.deleteMany({ where: { id: { in: toDelete } } });
  }
}
