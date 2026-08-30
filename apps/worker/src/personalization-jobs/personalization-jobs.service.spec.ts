import { PersonalizationJobsService } from "./personalization-jobs.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("PersonalizationJobsService", () => {
  it("upserts affinities from recently viewed products", async () => {
    const prisma = {
      featureFlag: { findUnique: jest.fn().mockResolvedValue({ isEnabled: true }) },
      recentlyViewed: {
        findMany: jest.fn().mockResolvedValue([
          { userId: "user-1", productSlug: "classic-crew-neck-tee" },
          { userId: "user-1", productSlug: "classic-crew-neck-tee" },
          { userId: "user-1", productSlug: "oversized-graphic-tee" },
        ]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            slug: "classic-crew-neck-tee",
            categories: [{ category: { slug: "men-t-shirts" } }],
          },
          {
            slug: "oversized-graphic-tee",
            categories: [{ category: { slug: "men-t-shirts" } }],
          },
        ]),
      },
      personalizationProfile: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const service = new PersonalizationJobsService(prisma as unknown as PrismaService);
    await service.aggregateProfiles();
    expect(prisma.personalizationProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({
          userId: "user-1",
          productAffinities: expect.arrayContaining([
            { slug: "classic-crew-neck-tee", score: 2 },
          ]),
        }),
      }),
    );
  });

  it("skips aggregation when the personalization flag is off", async () => {
    const prisma = {
      featureFlag: { findUnique: jest.fn().mockResolvedValue({ isEnabled: false }) },
      recentlyViewed: { findMany: jest.fn() },
      personalizationProfile: { upsert: jest.fn() },
    };
    const service = new PersonalizationJobsService(prisma as unknown as PrismaService);
    await service.aggregateProfiles();
    expect(prisma.recentlyViewed.findMany).not.toHaveBeenCalled();
  });
});
