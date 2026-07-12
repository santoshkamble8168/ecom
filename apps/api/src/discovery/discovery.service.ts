import { NotFoundError, buildPaginationMeta, paginationSkip } from "@ecom/shared";
import type { ProductFacets, ProductListResult, ProductSortKey } from "@ecom/types";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { productInclude, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

import type { DiscoveryQueryDto } from "./dto/discovery-query.dto";
import type { SearchAnalyticsDto } from "./dto/search-analytics.dto";
import { MeilisearchService } from "./meilisearch.service";
import { buildProductOrderBy } from "./policies/sort.policy";
import { parsePrice, parseSortKey } from "./utils/filter.parser";

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meilisearch: MeilisearchService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext("DiscoveryService");
  }

  async listProducts(query: DiscoveryQueryDto, opts?: { categorySlug?: string; collectionSlug?: string }) {
    const sort = parseSortKey(query.sort);
    const where = await this.buildWhere(query, opts);

    const [totalItems, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: buildProductOrderBy(sort),
        skip: paginationSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
    ]);

    const facets = await this.buildFacets(where);

    return this.toListResult(products, totalItems, query, sort, facets, "postgres");
  }

  async searchProducts(query: DiscoveryQueryDto): Promise<ProductListResult> {
    const sort = parseSortKey(query.sort);
    const q = query.q?.trim() ?? "";

    if (q && this.meilisearch.isAvailable()) {
      try {
        return await this.searchViaMeilisearch(query, q, sort);
      } catch (error) {
        this.logger.warn(`Meilisearch search failed, using Postgres: ${String(error)}`);
      }
    }

    const result = await this.listProducts(query);
    await this.logSearch(q, result.meta.pagination.totalItems, query);
    return result;
  }

  async getCategoryProducts(slug: string, query: DiscoveryQueryDto) {
    const category = await this.prisma.category.findFirst({ where: { slug, isActive: true } });
    if (!category) throw new NotFoundError("Category not found");
    return this.listProducts(query, { categorySlug: slug });
  }

  async getCollectionProducts(slug: string, query: DiscoveryQueryDto) {
    const collection = await this.prisma.collection.findFirst({ where: { slug, isActive: true } });
    if (!collection) throw new NotFoundError("Collection not found");
    return this.listProducts(query, { collectionSlug: slug });
  }

  async logSearchAnalytics(dto: SearchAnalyticsDto) {
    await this.logSearch(dto.query, dto.resultCount, dto.filters);
    return { logged: true };
  }

  private async searchViaMeilisearch(
    query: DiscoveryQueryDto,
    q: string,
    sort: ProductSortKey,
  ): Promise<ProductListResult> {
    const filterParts: string[] = [];
    if (query.sizesList.length) {
      filterParts.push(`(${query.sizesList.map((s) => `sizes = "${s}"`).join(" OR ")})`);
    }
    if (query.colorsList.length) {
      filterParts.push(`(${query.colorsList.map((c) => `colors = "${c}"`).join(" OR ")})`);
    }
    if (query.brandsList.length) {
      filterParts.push(`(${query.brandsList.map((b) => `brand = "${b}"`).join(" OR ")})`);
    }
    const minPrice = parsePrice(query.minPrice);
    const maxPrice = parsePrice(query.maxPrice);
    if (minPrice != null) filterParts.push(`basePrice >= ${minPrice}`);
    if (maxPrice != null) filterParts.push(`basePrice <= ${maxPrice}`);

    const offset = paginationSkip(query.page, query.pageSize);
    const { hits, estimatedTotalHits } = await this.meilisearch.search(q, {
      limit: query.pageSize,
      offset,
      filter: filterParts.length ? filterParts.join(" AND ") : undefined,
    });

    const slugs = hits.map((h) => h.slug);
    const products = slugs.length
      ? await this.prisma.product.findMany({
          where: { slug: { in: slugs }, status: "published" },
          include: productInclude,
        })
      : [];

    const slugOrder = new Map(slugs.map((s, i) => [s, i]));
    products.sort((a, b) => (slugOrder.get(a.slug) ?? 0) - (slugOrder.get(b.slug) ?? 0));

    const facets = await this.buildFacets({ status: "published" });
    await this.logSearch(q, estimatedTotalHits, query);

    return this.toListResult(products, estimatedTotalHits, query, sort, facets, "meilisearch");
  }

  private async buildWhere(
    query: DiscoveryQueryDto,
    opts?: { categorySlug?: string; collectionSlug?: string },
  ): Promise<Prisma.ProductWhereInput> {
    const minPrice = parsePrice(query.minPrice);
    const maxPrice = parsePrice(query.maxPrice);

    const categorySlugs = opts?.categorySlug
      ? await this.resolveCategorySlugs(opts.categorySlug)
      : undefined;

    const variantFilters: Prisma.ProductVariantWhereInput[] = [];
    if (query.sizesList.length) {
      variantFilters.push({
        options: { some: { attributeValue: { slug: { in: query.sizesList }, attribute: { key: "size" } } } },
      });
    }
    if (query.colorsList.length) {
      variantFilters.push({
        options: { some: { attributeValue: { slug: { in: query.colorsList }, attribute: { key: "color" } } } },
      });
    }

    return {
      status: "published",
      ...(opts?.collectionSlug && {
        collections: { some: { collection: { slug: opts.collectionSlug } } },
      }),
      ...(categorySlugs && {
        categories: { some: { category: { slug: { in: categorySlugs } } } },
      }),
      ...(query.q && {
        OR: [
          { title: { contains: query.q, mode: "insensitive" } },
          { brand: { contains: query.q, mode: "insensitive" } },
          { description: { contains: query.q, mode: "insensitive" } },
        ],
      }),
      ...(query.brandsList.length && { brand: { in: query.brandsList } }),
      ...(minPrice != null && { basePrice: { gte: minPrice } }),
      ...(maxPrice != null && {
        basePrice: { ...(minPrice != null ? { gte: minPrice } : {}), lte: maxPrice },
      }),
      ...(query.onSale && {
        AND: [
          { compareAtPrice: { not: null } },
          { basePrice: { not: null } },
        ],
      }),
      ...(variantFilters.length && {
        variants: { some: { AND: variantFilters } },
      }),
    };
  }

  private async resolveCategorySlugs(slug: string): Promise<string[]> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) return [slug];

    const closures = await this.prisma.categoryClosure.findMany({
      where: { ancestorId: category.id },
      include: { descendant: true },
    });

    return closures.map((c) => c.descendant.slug);
  }

  private async buildFacets(baseWhere: Prisma.ProductWhereInput): Promise<ProductFacets> {
    const products = await this.prisma.product.findMany({
      where: baseWhere,
      select: {
        brand: true,
        basePrice: true,
        variants: {
          where: { isActive: true },
          select: {
            options: {
              select: {
                attributeValue: {
                  select: { slug: true, value: true, attribute: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    });

    const sizeCounts = new Map<string, { label: string; count: number }>();
    const colorCounts = new Map<string, { label: string; count: number }>();
    const brandCounts = new Map<string, number>();
    let min = Infinity;
    let max = 0;

    for (const p of products) {
      if (p.brand) brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
      if (p.basePrice) {
        const price = Number(p.basePrice);
        min = Math.min(min, price);
        max = Math.max(max, price);
      }
      for (const v of p.variants) {
        for (const o of v.options) {
          const av = o.attributeValue;
          if (av.attribute.key === "size") {
            const cur = sizeCounts.get(av.slug) ?? { label: av.value, count: 0 };
            sizeCounts.set(av.slug, { label: av.value, count: cur.count + 1 });
          }
          if (av.attribute.key === "color") {
            const cur = colorCounts.get(av.slug) ?? { label: av.value, count: 0 };
            colorCounts.set(av.slug, { label: av.value, count: cur.count + 1 });
          }
        }
      }
    }

    const toFacet = (map: Map<string, { label: string; count: number }>) =>
      [...map.entries()]
        .map(([slug, { label, count }]) => ({ slug, label, count }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return {
      sizes: toFacet(sizeCounts),
      colors: toFacet(colorCounts),
      brands: [...brandCounts.entries()].map(([label, count]) => ({
        slug: label,
        label,
        count,
      })),
      priceRange: {
        min: min === Infinity ? 0 : min,
        max: max || 0,
      },
    };
  }

  private toListResult(
    products: Parameters<typeof toProductSummary>[0][],
    totalItems: number,
    query: DiscoveryQueryDto,
    sort: ProductSortKey,
    facets: ProductFacets,
    searchEngine: "meilisearch" | "postgres",
  ): ProductListResult {
    return {
      items: products.map(toProductSummary),
      facets,
      meta: {
        pagination: buildPaginationMeta(query.page, query.pageSize, totalItems),
        sort,
        searchEngine,
      },
    };
  }

  private async logSearch(query: string, resultCount: number, filters?: unknown) {
    if (!query) return;
    try {
      await this.prisma.searchLog.create({
        data: {
          query,
          resultCount,
          filters: filters ? (filters as object) : undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log search: ${String(error)}`);
    }
  }
}
