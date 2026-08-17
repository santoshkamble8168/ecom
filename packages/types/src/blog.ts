/** Blog domain (Sprint 11): posts, categories, tags, SEO, internal linking. */

import type { ContentStatus, PageSeo } from "./cms";

export interface BlogCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface BlogTagSummary {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPostSummary extends PageSeo {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  authorName: string;
  status: ContentStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  categories: BlogCategorySummary[];
  tags: BlogTagSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostDetail extends BlogPostSummary {
  contentHtml: string;
  relatedProductSkus: string[];
}

export interface UpsertBlogPostInput extends Partial<PageSeo> {
  slug: string;
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  authorName: string;
  contentHtml: string;
  categoryIds?: string[];
  tagIds?: string[];
  relatedProductSkus?: string[];
}
