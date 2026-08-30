import type { BlogPostSummary, CategorySummary, CollectionSummary, ProductListResult } from "@ecom/types";
import type { MetadataRoute } from "next";

import { apiFetch } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

const STATIC_PATHS = ["/", "/men", "/women", "/search", "/blog", "/pages/faq", "/pages/privacy-policy"];

function flattenCategories(categories: CategorySummary[]): string[] {
  const slugs: string[] = [];
  for (const category of categories) {
    slugs.push(category.slug);
    if (category.children?.length) slugs.push(...flattenCategories(category.children));
  }
  return slugs;
}

async function productPaths(): Promise<string[]> {
  const paths: string[] = [];
  for (let page = 1; page <= 20; page += 1) {
    let result: ProductListResult;
    try {
      result = await apiFetch<ProductListResult>(`/products?page=${page}&pageSize=100&sort=newest`);
    } catch {
      break;
    }
    for (const item of result.items) paths.push(`/products/${item.slug}`);
    if (page >= result.meta.pagination.totalPages) break;
  }
  return paths;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, collections, blog, products] = await Promise.all([
    apiFetch<CategorySummary[]>("/categories").catch(() => [] as CategorySummary[]),
    apiFetch<CollectionSummary[]>("/collections").catch(() => [] as CollectionSummary[]),
    apiFetch<{ posts: BlogPostSummary[] }>("/blog/posts?page=1&pageSize=100").catch(() => null),
    productPaths(),
  ]);

  const paths = [
    ...STATIC_PATHS,
    ...flattenCategories(categories).map((slug) => `/categories/${slug}`),
    ...collections.map((collection) => `/collections/${collection.slug}`),
    ...(blog?.posts ?? []).map((post) => `/blog/${post.slug}`),
    ...products,
  ];

  return paths.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
