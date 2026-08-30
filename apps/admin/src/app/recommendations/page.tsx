"use client";

import type { RecommendationSlotConfig } from "@ecom/types";
import { RecommendationSlotRow } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

export default function AdminRecommendationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-recommendation-slots"],
    queryFn: () => apiFetch<RecommendationSlotConfig[]>("/admin/recommendations/slots"),
  });
  const [drafts, setDrafts] = useState<Record<string, RecommendationSlotConfig>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (slot: RecommendationSlotConfig) =>
      apiFetch<RecommendationSlotConfig>(`/admin/recommendations/slots/${encodeURIComponent(slot.slot)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: slot.title,
          strategy: slot.strategy,
          isEnabled: slot.isEnabled,
          fallbackProductSlugs: slot.fallbackProductSlugs,
          limit: slot.limit,
        }),
      }),
    onSuccess: () => {
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-recommendation-slots"] });
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const slots = (data ?? []).map((slot) => drafts[slot.slot] ?? slot);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Recommendations</h1>
        <p className="text-sm text-neutral-500">
          Rule-based merchandising slots. AI and semantic search stay behind feature flags and do
          not change checkout.
        </p>
      </div>

      {isLoading && <p className="text-neutral-500">Loading recommendation slots…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load recommendation slots."}
        </p>
      )}
      {saveError && <p className="text-danger-600">{saveError}</p>}

      {!isLoading && !isError && (
        <div className="rounded-lg border border-neutral-200 px-4 dark:border-neutral-800">
          {slots.length === 0 ? (
            <p className="py-6 text-neutral-500">No slots configured. Run the API seed.</p>
          ) : (
            slots.map((slot) => (
              <RecommendationSlotRow
                key={slot.slot}
                slot={slot}
                saving={mutation.isPending && mutation.variables?.slot === slot.slot}
                onChange={(patch) =>
                  setDrafts((current) => ({
                    ...current,
                    [slot.slot]: { ...slot, ...patch },
                  }))
                }
                onSave={() => mutation.mutate(slot)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
