import { ConflictError } from "@ecom/shared";
import type {
  HomepageBlock,
  HomepageSummary,
  NavigationNode,
  NavigationSummary,
  NewsletterSubscribeResult,
  SearchSuggestion,
  SearchSuggestionsResponse,
  TrendingSearchesResponse,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";

import { productInclude, toCollectionSummary, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

import type { NewsletterSubscribeDto } from "./dto/newsletter-subscribe.dto";

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext("StorefrontService");
  }

  async getHomepage(): Promise<HomepageSummary> {
    const blocks = await this.prisma.homepageBlock.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const resolved: HomepageBlock[] = [];

    for (const block of blocks) {
      const content = block.content as Record<string, unknown>;
      switch (block.type) {
        case "hero":
        case "shop-by-gender":
        case "social-proof":
        case "trust-badges":
        case "newsletter":
          resolved.push({ type: block.type, ...content } as HomepageBlock);
          break;
        case "collection-rail": {
          const slugs = (content.collectionSlugs as string[]) ?? [];
          const collections = await this.prisma.collection.findMany({
            where: { slug: { in: slugs }, isActive: true },
          });
          resolved.push({
            type: "collection-rail",
            title: (content.title as string) ?? block.title ?? "",
            collections: collections.map(toCollectionSummary),
          });
          break;
        }
        case "product-rail": {
          const collectionSlug = content.collectionSlug as string | undefined;
          const limit = (content.limit as number) ?? 8;
          const products = await this.prisma.product.findMany({
            where: {
              status: "published",
              ...(collectionSlug && {
                collections: { some: { collection: { slug: collectionSlug } } },
              }),
            },
            include: productInclude,
            orderBy: { publishedAt: "desc" },
            take: limit,
          });
          resolved.push({
            type: "product-rail",
            title: (content.title as string) ?? block.title ?? "",
            products: products.map(toProductSummary),
          });
          break;
        }
        default:
          this.logger.warn(`Unknown homepage block type: ${block.type}`);
      }
    }

    return { blocks: resolved };
  }

  async getNavigation(): Promise<NavigationSummary> {
    const [announcement, items] = await Promise.all([
      this.prisma.announcementBar.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.navigationItem.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const byLocation = (location: string) =>
      this.buildNavTree(items.filter((i) => i.location === location));

    return {
      announcement: announcement
        ? {
            message: announcement.message,
            linkUrl: announcement.linkUrl,
            linkLabel: announcement.linkLabel,
          }
        : null,
      header: byLocation("header"),
      footer: {
        shop: byLocation("footer_shop"),
        support: byLocation("footer_support"),
        legal: byLocation("footer_legal"),
      },
    };
  }

  async getSearchSuggestions(query: string): Promise<SearchSuggestionsResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { query: trimmed, suggestions: [] };
    }

    const [products, categories, collections] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: "published",
          OR: [
            { title: { contains: trimmed, mode: "insensitive" } },
            { brand: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { title: true, slug: true },
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          name: { contains: trimmed, mode: "insensitive" },
        },
        take: 3,
        select: { name: true, slug: true },
      }),
      this.prisma.collection.findMany({
        where: {
          isActive: true,
          name: { contains: trimmed, mode: "insensitive" },
        },
        take: 3,
        select: { name: true, slug: true },
      }),
    ]);

    const suggestions: SearchSuggestion[] = [
      ...products.map((p) => ({
        type: "product" as const,
        label: p.title,
        href: `/products/${p.slug}`,
      })),
      ...categories.map((c) => ({
        type: "category" as const,
        label: c.name,
        href: `/categories/${c.slug}`,
      })),
      ...collections.map((c) => ({
        type: "collection" as const,
        label: c.name,
        href: `/collections/${c.slug}`,
      })),
    ];

    return { query: trimmed, suggestions };
  }

  async getTrendingSearches(): Promise<TrendingSearchesResponse> {
    const terms = await this.prisma.trendingSearch.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
    });
    return { terms: terms.map((t) => t.term) };
  }

  async subscribeNewsletter(dto: NewsletterSubscribeDto): Promise<NewsletterSubscribeResult> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictError("This email is already subscribed");
    }

    await this.prisma.newsletterSubscriber.create({ data: { email: dto.email } });
    this.logger.log(`Newsletter subscription: ${dto.email}`);
    return { email: dto.email, subscribed: true };
  }

  private buildNavTree(
    items: Array<{ id: string; label: string; href: string; parentId: string | null }>,
  ): NavigationNode[] {
    const map = new Map<string, NavigationNode & { id: string; parentId: string | null }>();
    for (const item of items) {
      map.set(item.id, { id: item.id, label: item.label, href: item.href, parentId: item.parentId, children: [] });
    }

    const roots: NavigationNode[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children!.push(node);
      } else if (!node.parentId) {
        roots.push(node);
      }
    }

    return roots.map(({ label, href, children }) => ({
      label,
      href,
      ...(children && children.length > 0 ? { children } : {}),
    }));
  }
}
