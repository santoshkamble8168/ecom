"use client";

import type { BannerPlacement, BannerSummary, ContentStatus, PaginationMeta } from "@ecom/types";
import { Button, Card, CardContent } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { BannerForm } from "@/components/cms/banner-form";
import { ContentStatusBadge } from "@/components/cms/status-badge";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

const BANNER_PLACEMENTS: BannerPlacement[] = [
  "homepage_hero",
  "homepage_strip",
  "category_top",
  "cart_strip",
];
const CONTENT_STATUSES: ContentStatus[] = ["draft", "scheduled", "published", "archived"];
const PAGE_SIZE = 20;

/**
 * `adminListBanners` nests pagination inside `data.meta.pagination` rather
 * than the flat `{items, total, page, pageSize}` shape used elsewhere —
 * confirmed by reading `apps/api/src/cms/cms.service.ts`.
 */
interface AdminBannersListResponse {
  items: BannerSummary[];
  meta: { pagination: PaginationMeta };
}

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [placement, setPlacement] = useState<BannerPlacement | "">("");
  const [status, setStatus] = useState<ContentStatus | "">("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerSummary | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-banners", { placement, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (placement) params.set("placement", placement);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetch<AdminBannersListResponse>(
        `/admin/cms/banners?${params.toString()}`,
      );
      return { items: result.items, pagination: result.meta.pagination };
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/cms/banners/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      setPublishError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    },
    onError: (err: Error) => setPublishError(err.message),
  });

  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Banners</h1>
        <Button
          type="button"
          onClick={() => {
            setEditingBanner(null);
            setShowForm(true);
          }}
        >
          New Banner
        </Button>
      </div>

      {showForm && (
        <BannerForm
          banner={editingBanner}
          onDone={() => {
            setShowForm(false);
            setEditingBanner(null);
          }}
        />
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500" htmlFor="filter-placement">
              Placement
            </label>
            <select
              id="filter-placement"
              value={placement}
              onChange={(e) => {
                setPlacement(e.target.value as BannerPlacement | "");
                setPage(1);
              }}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All placements</option>
              {BANNER_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, " ")}
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

      {publishError && <p className="text-sm text-danger-600">{publishError}</p>}

      {isLoading && <p className="text-neutral-500">Loading banners…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load banners."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Placement</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Sort</th>
                <th className="px-4 py-3 text-left font-semibold">Starts</th>
                <th className="px-4 py-3 text-left font-semibold">Ends</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((banner) => (
                <tr key={banner.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-medium">{banner.title}</td>
                  <td className="px-4 py-3">{banner.placement.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <ContentStatusBadge status={banner.status} />
                  </td>
                  <td className="px-4 py-3">{banner.sortOrder}</td>
                  <td className="px-4 py-3">{formatDate(banner.startsAt)}</td>
                  <td className="px-4 py-3">{formatDate(banner.endsAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBanner(banner);
                          setShowForm(true);
                        }}
                        className="text-brand-600 hover:underline"
                      >
                        Edit
                      </button>
                      {banner.status !== "published" && (
                        <button
                          type="button"
                          onClick={() => publishMutation.mutate(banner.id)}
                          disabled={publishMutation.isPending}
                          className="text-brand-600 hover:underline disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.items.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No banners found.</p>
          )}
        </div>
      )}

      {data && data.pagination && data.pagination.totalItems > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.pagination.page} of {totalPages} · {data.pagination.totalItems} banners
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
