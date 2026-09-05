"use client";

import type { CampaignStatus, CampaignSummary, UpsertCampaignInput } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { CampaignForm } from "@/components/promotions/campaign-form";
import { CampaignStatusBadge } from "@/components/promotions/campaign-status-badge";
import { apiFetch, apiFetchWithMeta } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface CampaignListResult {
  campaigns: CampaignSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const CAMPAIGN_STATUS_OPTIONS: CampaignStatus[] = ["scheduled", "active", "ended", "cancelled"];
const PAGE_SIZE = 20;

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CampaignStatus | "">("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-campaigns", { status, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<CampaignListResult>(`/admin/campaigns?${params.toString()}`);
      return result.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: UpsertCampaignInput) =>
      apiFetch<CampaignSummary>("/admin/campaigns", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      setCreateError(null);
      setShowCreate(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Campaigns"
        description="Schedule promotions and edit campaign targeting."
        actions={
          <Button type="button" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "Create Campaign"}
          </Button>
        }
      />

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignForm
              submitLabel="Create Campaign"
              isSubmitting={createMutation.isPending}
              error={createError}
              autoSlug
              onSubmit={(input) => createMutation.mutate(input)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as CampaignStatus | "");
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All statuses</option>
            {CAMPAIGN_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load campaigns."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Discount</th>
                <th className="px-4 py-3 text-left font-semibold">Dates</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-medium">{campaign.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{campaign.slug}</td>
                  <td className="px-4 py-3 capitalize">{campaign.type}</td>
                  <td className="px-4 py-3">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3">
                    {campaign.discountType && campaign.discountValue
                      ? campaign.discountType === "percent"
                        ? `${campaign.discountValue}%`
                        : campaign.discountType === "fixed"
                          ? formatCurrency(campaign.discountValue)
                          : "Free shipping"
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(campaign.startsAt)} – {formatDate(campaign.endsAt)}
                  </td>
                  <td className="px-4 py-3">{campaign.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/campaigns/${campaign.id}`} className="text-brand-600 hover:underline">
                        Edit
                      </Link>
                      <a
                        href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"}/campaign/${campaign.slug}`}
                        className="text-brand-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Shop
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.campaigns.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No campaigns found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} campaigns
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
