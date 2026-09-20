import { ConflictError } from "@ecom/shared";
import type {
  ContactMessageResult,
  HomepageBlock,
  HomepageSummary,
  NavigationNode,
  NavigationSummary,
  NewsletterSubscribeResult,
  ProductSummary,
  SearchSuggestion,
  SearchSuggestionsResponse,
  TrendingSearchesResponse,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";

import { productInclude, toCollectionSummary, toProductSummary } from "../catalog/mappers/catalog.mapper";
import { AppLogger } from "../logger/logger.service";
import { PricingService } from "../pricing/pricing.service";
import { PrismaService } from "../prisma/prisma.service";

import { shouldDropAsBot } from "./bot-protection";
import type { ContactMessageDto } from "./dto/contact-message.dto";
import type { NewsletterSubscribeDto } from "./dto/newsletter-subscribe.dto";

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
    private readonly pricingService: PricingService,
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
          const summaries = await this.enrichWithPricing(products, products.map(toProductSummary));
          resolved.push({
            type: "product-rail",
            title: (content.title as string) ?? block.title ?? "",
            products: summaries,
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
    const email = dto.email.trim().toLowerCase();
    if (shouldDropAsBot(dto.website)) {
      this.logger.warn("Dropped newsletter subscribe as bot (honeypot)");
      return { email, subscribed: true };
    }

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictError("This email is already subscribed");
    }

    await this.prisma.newsletterSubscriber.create({ data: { email } });
    this.logger.log(`Newsletter subscription: ${email}`);
    return { email, subscribed: true };
  }

  async submitContact(dto: ContactMessageDto): Promise<ContactMessageResult> {
    if (shouldDropAsBot(dto.website)) {
      this.logger.warn("Dropped contact message as bot (honeypot)");
      return { received: true };
    }

    this.logger.log(
      `Contact message from ${dto.email.trim().toLowerCase()} (${dto.name.trim()}): ${dto.message.trim().slice(0, 200)}`,
    );
    return { received: true };
  }

  /**
   * Sprint 10 pricing enrichment for homepage product rails (additive,
   * best-effort — mirrors `DiscoveryService`'s PLP enrichment). Never throws;
   * falls back to unenriched summaries so the homepage never breaks on it.
   */
  private async enrichWithPricing(
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
      this.logger.warn(`Pricing enrichment failed for homepage rail, serving base prices: ${String(error)}`);
      return summaries;
    }
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
