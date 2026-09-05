"use client";

import type { CampaignStatus, CampaignSummary, UpsertCampaignInput } from "@ecom/types";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CampaignCollectionPanel } from "@/components/promotions/campaign-collection-panel";
import { CampaignForm } from "@/components/promotions/campaign-form";
import { CampaignSkuPanel } from "@/components/promotions/campaign-sku-panel";
import { CAMPAIGN_ALLOWED_TRANSITIONS, CampaignStatusBadge } from "@/components/promotions/campaign-status-badge";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<CampaignStatus | "">("");

  const {
    data: campaign,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ["admin-campaign", campaignId],
    queryFn: () => apiFetch<CampaignSummary>(`/admin/campaigns/${campaignId}`),
    enabled: Boolean(campaignId),
  });

  function applyUpdate(updated: CampaignSummary) {
    queryClient.setQueryData(["admin-campaign", campaignId], updated);
    void queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
  }

  const updateMutation = useMutation({
    mutationFn: (input: UpsertCampaignInput) =>
      apiFetch<CampaignSummary>(`/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (updated) => {
      setFormError(null);
      applyUpdate(updated);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: (status: CampaignStatus) =>
      apiFetch<CampaignSummary>(`/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (updated) => {
      setStatusError(null);
      setNextStatus("");
      applyUpdate(updated);
    },
    onError: (err: Error) => setStatusError(err.message),
  });

  const allowedTransitions = campaign ? CAMPAIGN_ALLOWED_TRANSITIONS[campaign.status] : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold">Campaign{campaign ? `: ${campaign.name}` : ""}</h1>
          {campaign && <CampaignStatusBadge status={campaign.status} />}
        </div>
        <Link href="/campaigns" className="text-sm text-brand-600 hover:underline">
          ← Back to campaigns
        </Link>
      </div>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {loadError instanceof Error ? loadError.message : "Failed to load campaign."}
        </p>
      )}

      {campaign && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <CampaignForm
                  key={campaign.id}
                  initial={campaign}
                  submitLabel="Save Changes"
                  isSubmitting={updateMutation.isPending}
                  error={formError}
                  onSubmit={(input) => updateMutation.mutate(input)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  <p>
                    Current status: <CampaignStatusBadge status={campaign.status} />
                  </p>
                  <p className="mt-2">Created {formatDateTime(campaign.createdAt)}</p>
                  <p>Updated {formatDateTime(campaign.updatedAt)}</p>
                  <p className="mt-3">
                    Shopper URL:{" "}
                    <a
                      href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"}/campaign/${campaign.slug}`}
                      className="break-all text-brand-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {(process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000") +
                        `/campaign/${campaign.slug}`}
                    </a>
                  </p>
                </div>

                {allowedTransitions.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    This campaign is in a terminal state; no further transitions are possible.
                  </p>
                ) : (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (nextStatus) statusMutation.mutate(nextStatus);
                    }}
                  >
                    <label
                      htmlFor="campaign-next-status"
                      className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
                    >
                      Transition to
                    </label>
                    <select
                      id="campaign-next-status"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as CampaignStatus | "")}
                      className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="">Select status…</option>
                      {allowedTransitions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div>
                      <Button type="submit" size="sm" disabled={!nextStatus || statusMutation.isPending}>
                        {statusMutation.isPending ? "Updating…" : "Update status"}
                      </Button>
                    </div>
                    {statusError && <p className="text-sm text-danger-600">{statusError}</p>}
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attached Products (SKUs)</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignSkuPanel campaignId={campaign.id} skus={campaign.productSkus} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attached Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignCollectionPanel campaignId={campaign.id} collectionIds={campaign.collectionIds} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
