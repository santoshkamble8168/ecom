import { absoluteUrl, buildRobotsTxt } from "@ecom/shared";
import { Inject, Injectable } from "@nestjs/common";
import type { ApiEnv } from "@ecom/config";

import { APP_ENV } from "../config/config.module";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  robotsTxt(): string {
    return buildRobotsTxt(this.env.STOREFRONT_URL);
  }

  async sitemapXml(): Promise<string> {
    const origin = this.env.STOREFRONT_URL;
    const urls = await this.collectUrls();
    const body = urls
      .map((path) => `  <url><loc>${escapeXml(absoluteUrl(origin, path))}</loc></url>`)
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  }

  private async collectUrls(): Promise<string[]> {
    const [products, categories, collections, pages, posts] = await Promise.all([
      this.prisma.product.findMany({ where: { status: "published" }, select: { slug: true } }),
      this.prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
      this.prisma.collection.findMany({ where: { isActive: true }, select: { slug: true } }),
      this.prisma.page.findMany({ where: { status: "published" }, select: { slug: true } }),
      this.prisma.blogPost.findMany({ where: { status: "published" }, select: { slug: true } }),
    ]);

    return [
      "/",
      "/men",
      "/women",
      "/search",
      "/blog",
      ...products.map((row) => `/products/${row.slug}`),
      ...categories.map((row) => `/categories/${row.slug}`),
      ...collections.map((row) => `/collections/${row.slug}`),
      ...pages.map((row) => `/pages/${row.slug}`),
      ...posts.map((row) => `/blog/${row.slug}`),
    ];
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
