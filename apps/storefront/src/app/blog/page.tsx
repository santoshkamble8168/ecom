import type { BlogCategorySummary, BlogPostSummary, BlogTagSummary } from "@ecom/types";
import type { Metadata } from "next";
import Link from "next/link";

import { BlogPostCard } from "@/components/blog/blog-post-card";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog",
  description: "Style guides, brand stories, and news from the ECOM editorial team.",
};

const PAGE_SIZE = 12;

interface BlogPageProps {
  searchParams: Promise<{ category?: string; tag?: string; page?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category, tag, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const query = new URLSearchParams();
  if (category) query.set("categorySlug", category);
  if (tag) query.set("tagSlug", tag);
  query.set("page", String(currentPage));
  query.set("pageSize", String(PAGE_SIZE));

  let posts: BlogPostSummary[] = [];
  let total = 0;
  let categories: BlogCategorySummary[] = [];
  let tags: BlogTagSummary[] = [];
  try {
    const [postsResult, categoriesResult, tagsResult] = await Promise.all([
      apiFetch<{ posts: BlogPostSummary[]; total: number; page: number; pageSize: number }>(
        `/blog/posts?${query.toString()}`,
      ),
      apiFetch<BlogCategorySummary[]>("/blog/categories"),
      apiFetch<BlogTagSummary[]>("/blog/tags"),
    ]);
    posts = postsResult.posts;
    total = postsResult.total;
    categories = categoriesResult;
    tags = tagsResult;
  } catch {
    // API unreachable — degrade to an empty state rather than a 500 page.
  }

  const hasNextPage = currentPage * PAGE_SIZE < total;

  function pageHref(overrides: { category?: string | null; tag?: string | null; page?: number }): string {
    const sp = new URLSearchParams();
    const nextCategory = overrides.category === undefined ? category : overrides.category;
    const nextTag = overrides.tag === undefined ? tag : overrides.tag;
    if (nextCategory) sp.set("category", nextCategory);
    if (nextTag) sp.set("tag", nextTag);
    const nextPage = overrides.page ?? currentPage;
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/blog?${qs}` : "/blog";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-3 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span className="text-neutral-900 dark:text-neutral-200">Blog</span>
      </nav>
      <h1 className="mb-6 text-3xl font-display font-bold">Blog</h1>

      {(categories.length > 0 || tags.length > 0) && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={pageHref({ category: null, tag: null, page: 1 })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              !category && !tag
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={pageHref({ category: c.slug, page: 1 })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                category === c.slug
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {c.name}
            </Link>
          ))}
          {tags.map((t) => (
            <Link
              key={t.slug}
              href={pageHref({ tag: t.slug, page: 1 })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                tag === t.slug
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-8 text-center dark:border-neutral-800">
          <p className="text-lg font-semibold">No posts found</p>
          <p className="mt-2 text-sm text-neutral-500">Try a different category or tag.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {(currentPage > 1 || hasNextPage) && (
        <div className="mt-10 flex justify-center gap-2">
          <Link
            aria-disabled={currentPage <= 1}
            className={`rounded border px-3 py-1.5 text-sm dark:border-neutral-700 ${
              currentPage <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
            href={pageHref({ page: currentPage - 1 })}
          >
            Previous
          </Link>
          <span className="px-3 py-1.5 text-sm text-neutral-500">Page {currentPage}</span>
          <Link
            aria-disabled={!hasNextPage}
            className={`rounded border px-3 py-1.5 text-sm dark:border-neutral-700 ${
              !hasNextPage ? "pointer-events-none opacity-40" : ""
            }`}
            href={pageHref({ page: currentPage + 1 })}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
