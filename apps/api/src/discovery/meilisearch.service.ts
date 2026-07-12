import { Injectable, OnModuleInit } from "@nestjs/common";

import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

const PRODUCTS_INDEX = "products";

export interface MeiliProductDocument {
  slug: string;
  title: string;
  brand: string | null;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  categorySlugs: string[];
  collectionSlugs: string[];
  sizes: string[];
  colors: string[];
  imageUrl: string | null;
  publishedAt: number | null;
}

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly host = process.env.MEILISEARCH_HOST ?? "http://localhost:7700";
  private readonly apiKey = process.env.MEILISEARCH_API_KEY ?? "devMasterKeyChangeMe";
  private available = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext("MeilisearchService");
  }

  async onModuleInit() {
    try {
      await this.ensureIndex();
      await this.reindexAll();
      this.available = true;
      this.logger.log("Meilisearch index ready");
    } catch (error) {
      this.available = false;
      this.logger.warn(`Meilisearch unavailable, search will use Postgres fallback: ${String(error)}`);
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async search(
    query: string,
    options: { limit: number; offset: number; filter?: string },
  ): Promise<{ hits: MeiliProductDocument[]; estimatedTotalHits: number }> {
    const body = await this.request<{ hits: MeiliProductDocument[]; estimatedTotalHits: number }>(
      `/indexes/${PRODUCTS_INDEX}/search`,
      {
        method: "POST",
        body: JSON.stringify({
          q: query,
          limit: options.limit,
          offset: options.offset,
          filter: options.filter,
        }),
      },
    );
    return body;
  }

  async reindexAll(): Promise<number> {
    const products = await this.prisma.product.findMany({
      where: { status: "published" },
      include: {
        media: { orderBy: { sortOrder: "asc" }, take: 1 },
        categories: { include: { category: true } },
        collections: { include: { collection: true } },
        variants: {
          where: { isActive: true },
          include: {
            options: { include: { attributeValue: { include: { attribute: true } } } },
          },
        },
      },
    });

    const docs: MeiliProductDocument[] = products.map((p) => {
      const sizes = new Set<string>();
      const colors = new Set<string>();
      for (const v of p.variants) {
        for (const o of v.options) {
          if (o.attributeValue.attribute.key === "size") sizes.add(o.attributeValue.slug);
          if (o.attributeValue.attribute.key === "color") colors.add(o.attributeValue.slug);
        }
      }
      return {
        slug: p.slug,
        title: p.title,
        brand: p.brand,
        description: p.description,
        basePrice: p.basePrice ? Number(p.basePrice) : 0,
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        categorySlugs: p.categories.map((c) => c.category.slug),
        collectionSlugs: p.collections.map((c) => c.collection.slug),
        sizes: [...sizes],
        colors: [...colors],
        imageUrl: p.media[0]?.url ?? null,
        publishedAt: p.publishedAt ? p.publishedAt.getTime() : null,
      };
    });

    await this.request(`/indexes/${PRODUCTS_INDEX}/documents`, {
      method: "PUT",
      body: JSON.stringify(docs),
    });

    return docs.length;
  }

  private async ensureIndex() {
    try {
      await this.request(`/indexes/${PRODUCTS_INDEX}`, { method: "GET" });
    } catch {
      await this.request(`/indexes/${PRODUCTS_INDEX}`, {
        method: "POST",
        body: JSON.stringify({ primaryKey: "slug" }),
      });
    }

    await this.request(`/indexes/${PRODUCTS_INDEX}/settings`, {
      method: "PATCH",
      body: JSON.stringify({
        searchableAttributes: ["title", "brand", "description", "categorySlugs", "collectionSlugs"],
        filterableAttributes: [
          "categorySlugs",
          "collectionSlugs",
          "sizes",
          "colors",
          "brand",
          "basePrice",
        ],
        sortableAttributes: ["basePrice", "publishedAt"],
      }),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.host}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Meilisearch ${path} failed: ${response.status} ${text}`);
    }

    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }
}
