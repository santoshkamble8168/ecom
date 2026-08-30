import { SeoService } from "./seo.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { ApiEnv } from "@ecom/config";

describe("SeoService", () => {
  it("emits robots disallow and a sitemap loc for a published product", async () => {
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue([{ slug: "classic-tee" }]) },
      category: { findMany: jest.fn().mockResolvedValue([{ slug: "men" }]) },
      collection: { findMany: jest.fn().mockResolvedValue([]) },
      page: { findMany: jest.fn().mockResolvedValue([{ slug: "faq" }]) },
      blogPost: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new SeoService(prisma as unknown as PrismaService, {
      STOREFRONT_URL: "http://localhost:3000",
    } as ApiEnv);

    expect(service.robotsTxt()).toContain("Disallow: /cart");
    const xml = await service.sitemapXml();
    expect(xml).toContain("http://localhost:3000/products/classic-tee");
    expect(xml).toContain("http://localhost:3000/pages/faq");
  });
});
