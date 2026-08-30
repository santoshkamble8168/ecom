import type { ApiEnv } from "@ecom/config";

import type { AnalyticsService } from "../analytics/analytics.service";
import type { AuditService } from "../audit/audit.service";
import type { FeatureFlagsService } from "../platform/feature-flags.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { RedisService } from "../redis/redis.service";

import { RecommendationsService } from "./recommendations.service";

function publishedProduct(slug: string) {
  return {
    slug,
    title: slug,
    brand: "ECOM",
    status: "published",
    basePrice: { toString: () => "499.00" },
    compareAtPrice: null,
    publishedAt: new Date("2026-08-01T00:00:00.000Z"),
    media: [],
    categories: [],
    collections: [],
    tags: [],
    seo: null,
    variants: [],
  };
}

function buildService(overrides?: {
  prisma?: Partial<PrismaService>;
  flags?: Partial<FeatureFlagsService>;
}) {
  const prisma = {
    recommendationSlotConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([publishedProduct("classic-crew-neck-tee")]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    recentlyViewed: { findMany: jest.fn().mockResolvedValue([]) },
    productVariant: { findMany: jest.fn().mockResolvedValue([]) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    personalizationProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    ...overrides?.prisma,
  };
  const flags = {
    isEnabled: jest.fn().mockResolvedValue(false),
    ...overrides?.flags,
  };
  const redis = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue("OK"),
  };
  const analytics = { ingest: jest.fn().mockResolvedValue({ accepted: 1, duplicates: 0, skipped: 0 }) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const env = { RECOMMENDATION_CACHE_TTL_SECONDS: 60 } as ApiEnv;

  const service = new RecommendationsService(
    prisma as unknown as PrismaService,
    flags as unknown as FeatureFlagsService,
    redis as unknown as RedisService,
    env,
    analytics as unknown as AnalyticsService,
    audit as unknown as AuditService,
  );

  return { service, prisma, flags, redis, analytics, audit };
}

describe("RecommendationsService", () => {
  it("rejects unknown slots", async () => {
    const { service } = buildService();
    await expect(service.getSlot("not-a-slot", {})).rejects.toThrow(/Unknown recommendation slot/);
  });

  it("returns newest published products for cart_trending", async () => {
    const { service, prisma } = buildService();
    const result = await service.getSlot("cart_trending", {});
    expect(result.provider).toBe("rules");
    expect(result.strategy).toBe("trending");
    expect(result.aiEnabled).toBe(false);
    expect(result.products[0]?.slug).toBe("classic-crew-neck-tee");
    expect(prisma.product.findMany).toHaveBeenCalled();
  });

  it("falls back to merchandised slugs when a slot is disabled", async () => {
    const { service, prisma } = buildService({
      prisma: {
        recommendationSlotConfig: {
          findUnique: jest.fn().mockResolvedValue({
            slot: "homepage_trending",
            title: "Trending now",
            strategy: "trending",
            isEnabled: false,
            fallbackProductSlugs: ["oversized-graphic-tee"],
            limit: 8,
          }),
          findMany: jest.fn(),
          update: jest.fn(),
          create: jest.fn(),
        },
        product: {
          findMany: jest.fn().mockResolvedValue([publishedProduct("oversized-graphic-tee")]),
          findFirst: jest.fn(),
        },
      } as never,
    });

    const result = await service.getSlot("homepage_trending", {});
    expect(result.fallbackUsed).toBe(true);
    expect(result.products[0]?.slug).toBe("oversized-graphic-tee");
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slug: { in: ["oversized-graphic-tee"] } }),
      }),
    );
  });

  it("returns empty recently viewed without a session", async () => {
    const { service } = buildService();
    const result = await service.getSlot("recently_viewed", {});
    expect(result.products).toEqual([]);
    expect(result.fallbackUsed).toBe(false);
  });

  it("notes that the AI flag does not change the provider", async () => {
    const { service } = buildService({
      flags: { isEnabled: jest.fn().mockResolvedValue(true) },
    });
    const result = await service.getSlot("homepage_trending", {});
    expect(result.aiEnabled).toBe(true);
    expect(result.provider).toBe("rules");
    expect(result.reason).toMatch(/no model provider/i);
  });
});
