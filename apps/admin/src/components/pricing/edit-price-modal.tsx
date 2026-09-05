"use client";

import type { PriceListSummary, ProductPriceSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { upsertProductPriceFormSchema, type UpsertProductPriceFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function EditPriceModal({
  existing,
  priceLists,
  onClose,
}: {
  existing: ProductPriceSummary | null;
  priceLists: PriceListSummary[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const defaultPriceListId =
    existing?.priceListId ?? priceLists.find((pl) => pl.isDefault)?.id ?? priceLists[0]?.id ?? "";

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpsertProductPriceFormValues>({
    resolver: zodResolver(upsertProductPriceFormSchema),
    defaultValues: {
      variantSku: existing?.variantSku ?? "",
      priceListId: defaultPriceListId,
      mrp: existing?.mrp ?? "",
      sellingPrice: existing?.sellingPrice ?? "",
      salePrice: existing?.salePrice ?? "",
      saleStartsAt: toDatetimeLocalValue(existing?.saleStartsAt ?? null),
      saleEndsAt: toDatetimeLocalValue(existing?.saleEndsAt ?? null),
      reason: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: UpsertProductPriceFormValues) =>
      apiFetch<ProductPriceSummary>(`/admin/prices/${encodeURIComponent(values.variantSku.trim())}`, {
        method: "PUT",
        body: JSON.stringify({
          priceListId: values.priceListId || undefined,
          mrp: values.mrp.trim(),
          sellingPrice: values.sellingPrice.trim(),
          salePrice: values.salePrice.trim() || null,
          saleStartsAt: fromDatetimeLocalValue(values.saleStartsAt),
          saleEndsAt: fromDatetimeLocalValue(values.saleEndsAt),
          reason: values.reason.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-prices"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">{existing ? `Edit Price — ${existing.variantSku}` : "Set Price"}</h2>
        <form
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
          {existing ? (
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">Variant SKU</span>
              <input
                type="text"
                readOnly
                {...register("variantSku")}
                className={`${INPUT_CLASS} read-only:bg-neutral-100 dark:read-only:bg-neutral-800`}
              />
              <FieldError message={errors.variantSku?.message} />
            </label>
          ) : (
            <div className="sm:col-span-2">
              <Controller
                name="variantSku"
                control={control}
                render={({ field }) => (
                  <VariantSearchField
                    label="Variant SKU"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.variantSku?.message}
                  />
                )}
              />
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Price List</span>
            <select {...register("priceListId")} className={INPUT_CLASS}>
              {priceLists.map((priceList) => (
                <option key={priceList.id} value={priceList.id}>
                  {priceList.code} — {priceList.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.priceListId?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">MRP</span>
            <input type="text" placeholder="999.00" {...register("mrp")} className={INPUT_CLASS} />
            <FieldError message={errors.mrp?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Selling Price</span>
            <input type="text" placeholder="799.00" {...register("sellingPrice")} className={INPUT_CLASS} />
            <FieldError message={errors.sellingPrice?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Sale Price (optional, leave blank to clear)</span>
            <input type="text" placeholder="649.00" {...register("salePrice")} className={INPUT_CLASS} />
            <FieldError message={errors.salePrice?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Sale Starts</span>
            <input type="datetime-local" {...register("saleStartsAt")} className={INPUT_CLASS} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Sale Ends</span>
            <input type="datetime-local" {...register("saleEndsAt")} className={INPUT_CLASS} />
            <FieldError message={errors.saleEndsAt?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Reason (optional)</span>
            <input
              type="text"
              placeholder="Festive season promo"
              {...register("reason")}
              className={INPUT_CLASS}
            />
            <FieldError message={errors.reason?.message} />
          </label>

          {error && <p className="text-sm text-danger-600 sm:col-span-2">{error}</p>}

          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Price"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
