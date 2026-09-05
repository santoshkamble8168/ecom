"use client";

import type { ContentStatus, PageSummary, PageType, PaginationMeta } from "@ecom/types";
import { Button, Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ContentStatusBadge } from "@/components/cms/status-badge";
import { AdminPageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

const PAGE_TYPES: PageType[] = ["homepage", "landing", "campaign", "policy", "faq"];
const CONTENT_STATUSES: ContentStatus[] = ["draft", "scheduled", "published", "archived"];
const PAGE_SIZE = 20;

/**
 * `adminListPages` nests pagination inside `data.meta.pagination` rather than
 * the flat `{items, total, page, pageSize}` shape used elsewhere — confirmed
 * by reading `apps/api/src/cms/cms.service.ts`.
 */
interface AdminPagesListResponse {
  items: PageSummary[];
  meta: { pagination: PaginationMeta };
}

export default function PagesListPage() {
  const [type, setType] = useState<PageType | "">("");
  const [status, setStatus] = useState<ContentStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-pages", { type, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetch<AdminPagesListResponse>(
        `/admin/cms/pages?${params.toString()}`,
      );
      return { items: result.items, pagination: result.meta.pagination };
    },
  });

  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Pages"
        description="Edit CMS pages, publish, and manage SEO content."
        actions={
          <Link href="/pages/new">
            <Button type="button">New Page</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500" htmlFor="filter-type">
              Type
            </label>
            <select
              id="filter-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as PageType | "");
                setPage(1);
              }}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All types</option>
              {PAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

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
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load pages."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Scheduled</th>
                <th className="px-4 py-3 text-left font-semibold">Published</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 capitalize">{p.type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-3">
                    <ContentStatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">{formatDate(p.scheduledAt)}</td>
                  <td className="px-4 py-3">{formatDate(p.publishedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/pages/${p.id}`} className="text-brand-600 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.items.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No pages found.</p>
          )}
        </div>
      )}

      {data && data.pagination && data.pagination.totalItems > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.pagination.page} of {totalPages} · {data.pagination.totalItems} pages
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
