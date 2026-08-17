"use client";

import type { CampaignSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { campaignSkuFormSchema, type CampaignSkuFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";

export function CampaignSkuPanel({ campaignId, skus }: { campaignId: string; skus: string[] }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CampaignSkuFormValues>({
    resolver: zodResolver(campaignSkuFormSchema),
    defaultValues: { variantSku: "" },
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin-campaign", campaignId] });
  }

  const addMutation = useMutation({
    mutationFn: (variantSku: string) =>
      apiFetch<CampaignSummary>(`/admin/campaigns/${campaignId}/products`, {
        method: "POST",
        body: JSON.stringify({ variantSkus: [variantSku] }),
      }),
    onSuccess: () => {
      reset({ variantSku: "" });
      setError(null);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (variantSku: string) =>
      apiFetch<CampaignSummary>(`/admin/campaigns/${campaignId}/products/${variantSku}`, {
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
      {skus.length === 0 ? (
        <p className="text-sm text-neutral-500">No SKUs attached.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {skus.map((sku) => (
            <li
              key={sku}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
            >
              <span className="font-mono text-xs">{sku}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(sku)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-1"
        onSubmit={handleSubmit((values) => addMutation.mutate(values.variantSku.trim()))}
      >
        <div className="flex gap-2">
          <label htmlFor="campaign-add-sku" className="sr-only">
            Variant SKU
          </label>
          <input
            id="campaign-add-sku"
            type="text"
            placeholder="Variant SKU"
            {...register("variantSku")}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <Button type="submit" size="sm" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
        <FieldError message={errors.variantSku?.message} />
      </form>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
