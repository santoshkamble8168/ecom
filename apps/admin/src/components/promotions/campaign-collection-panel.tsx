"use client";

import type { CampaignSummary, CollectionSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CollectionSearchField } from "@/components/catalog/collection-search-field";
import { apiFetch } from "@/lib/api";

export function CampaignCollectionPanel({
  campaignId,
  collectionIds,
}: {
  campaignId: string;
  collectionIds: string[];
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data: collections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => apiFetch<CollectionSummary[]>("/admin/collections"),
  });

  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin-campaign", campaignId] });
  }

  const addMutation = useMutation({
    mutationFn: (collectionId: string) =>
      apiFetch<CampaignSummary>(`/admin/campaigns/${campaignId}/collections`, {
        method: "POST",
        body: JSON.stringify({ collectionIds: [collectionId] }),
      }),
    onSuccess: () => {
      setQuery("");
      setError(null);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (collectionId: string) =>
      apiFetch<CampaignSummary>(`/admin/campaigns/${campaignId}/collections/${collectionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-3">
      {collectionIds.length === 0 ? (
        <p className="text-sm text-neutral-500">No collections attached. Search by collection name below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {collectionIds.map((collectionId) => {
            const collection = collectionById.get(collectionId);
            return (
              <li
                key={collectionId}
                className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{collection?.name ?? collectionId}</p>
                  {collection ? (
                    <p className="font-mono text-xs text-neutral-500">{collection.slug}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(collectionId)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <CollectionSearchField
        id="campaign-add-collection"
        value={query}
        onChange={setQuery}
        excludeIds={collectionIds}
        onPick={(collection) => addMutation.mutate(collection.id)}
      />

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
