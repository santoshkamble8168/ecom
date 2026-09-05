"use client";

import type { CampaignSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { campaignSkuFormSchema, type CampaignSkuFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { VariantSearchField, type VariantSearchHit } from "@/components/catalog/variant-search-field";
import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";

export function CampaignSkuPanel({ campaignId, skus }: { campaignId: string; skus: string[] }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CampaignSkuFormValues>({
    resolver: zodResolver(campaignSkuFormSchema),
    defaultValues: { variantSku: "" },
  });

  const { data: labels = [] } = useQuery({
    queryKey: ["admin-variants", skus],
    queryFn: () =>
      apiFetch<VariantSearchHit[]>(`/admin/variants?skus=${encodeURIComponent(skus.join(","))}&pageSize=50`),
    enabled: skus.length > 0,
  });

  const labelBySku = new Map(labels.map((hit) => [hit.sku, hit]));

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
        <p className="text-sm text-neutral-500">No products attached. Search by name or SKU below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {skus.map((sku) => {
            const hit = labelBySku.get(sku);
            const optionText = hit?.options.map((option) => option.value).join(" / ");
            return (
              <li
                key={sku}
                className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{hit?.productTitle ?? sku}</p>
                  <p className="font-mono text-xs text-neutral-500">
                    {sku}
                    {optionText ? ` · ${optionText}` : ""}
                  </p>
                </div>
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
            );
          })}
        </ul>
      )}

      <form
        className="flex flex-col gap-1"
        onSubmit={handleSubmit((values) => addMutation.mutate(values.variantSku.trim()))}
      >
        <div className="flex items-end gap-2">
          <Controller
            name="variantSku"
            control={control}
            render={({ field }) => (
              <VariantSearchField
                id="campaign-add-sku"
                label="Variant SKU"
                value={field.value}
                onChange={field.onChange}
                excludeSkus={skus}
                onPick={(hit) => addMutation.mutate(hit.sku)}
              />
            )}
          />
          <Button type="submit" size="sm" className="mb-0.5" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
        <FieldError message={errors.variantSku?.message} />
      </form>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
