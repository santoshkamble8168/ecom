"use client";

import type { BlogCategorySummary, BlogPostSummary, BlogTagSummary, ContentStatus } from "@ecom/types";
import { Button, Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ContentStatusBadge } from "@/components/cms/status-badge";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface AdminBlogPostListResult {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const CONTENT_STATUSES: ContentStatus[] = ["draft", "scheduled", "published", "archived"];
const PAGE_SIZE = 20;

export default function BlogListPage() {
  const [status, setStatus] = useState<ContentStatus | "">("");
  const [categorySlug, setCategorySlug] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: () => apiFetch<BlogCategorySummary[]>(`/admin/blog/categories`),
  });

  const { data: tags } = useQuery({
    queryKey: ["admin-blog-tags"],
    queryFn: () => apiFetch<BlogTagSummary[]>(`/admin/blog/tags`),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-blog-posts", { status, categorySlug, tagSlug, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (categorySlug) params.set("categorySlug", categorySlug);
      if (tagSlug) params.set("tagSlug", tagSlug);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return apiFetch<AdminBlogPostListResult>(`/admin/blog/posts?${params.toString()}`);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Blog Posts</h1>
        <Link href="/blog/new">
          <Button type="button">New Post</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500" htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ContentStatus | "");
                setPage(1);
              }}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All statuses</option>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500" htmlFor="filter-category">
              Category
            </label>
            <select
              id="filter-category"
              value={categorySlug}
              onChange={(e) => {
                setCategorySlug(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500" htmlFor="filter-tag">
              Tag
            </label>
            <select
              id="filter-tag"
              value={tagSlug}
              onChange={(e) => {
                setTagSlug(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All tags</option>
              {tags?.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading posts…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load posts."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Author</th>
                <th className="px-4 py-3 text-left font-semibold">Categories</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Published</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.posts.map((post) => (
                <tr key={post.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-medium">{post.title}</td>
                  <td className="px-4 py-3">{post.authorName}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {post.categories.map((c) => c.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ContentStatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3">{formatDate(post.publishedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/blog/${post.id}`} className="text-brand-600 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.posts.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No blog posts found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} posts
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
