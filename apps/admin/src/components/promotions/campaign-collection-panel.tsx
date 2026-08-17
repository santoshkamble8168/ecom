"use client";

import type { CampaignSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { campaignCollectionFormSchema, type CampaignCollectionFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CampaignCollectionFormValues>({
    resolver: zodResolver(campaignCollectionFormSchema),
    defaultValues: { collectionId: "" },
  });

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
      reset({ collectionId: "" });
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
        <p className="text-sm text-neutral-500">No collections attached.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {collectionIds.map((collectionId) => (
            <li
              key={collectionId}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
            >
              <span className="font-mono text-xs">{collectionId}</span>
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
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-1"
        onSubmit={handleSubmit((values) => addMutation.mutate(values.collectionId.trim()))}
      >
        <div className="flex gap-2">
          <label htmlFor="campaign-add-collection" className="sr-only">
            Collection ID
          </label>
          <input
            id="campaign-add-collection"
            type="text"
            placeholder="Collection ID"
            {...register("collectionId")}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <Button type="submit" size="sm" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
        <FieldError message={errors.collectionId?.message} />
      </form>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
