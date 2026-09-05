"use client";

import type { StockItemSummary, WarehouseSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { stockTransferFormSchema, type StockTransferFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function TransferStockModal({
  warehouses,
  onClose,
}: {
  warehouses: WarehouseSummary[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StockTransferFormValues>({
    resolver: zodResolver(stockTransferFormSchema),
    defaultValues: {
      fromWarehouseId: warehouses[0]?.id ?? "",
      toWarehouseId: warehouses[1]?.id ?? warehouses[0]?.id ?? "",
      variantSku: "",
      quantity: "",
      note: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: (values: StockTransferFormValues) =>
      apiFetch<{ from: StockItemSummary; to: StockItemSummary }>("/admin/stock/transfer", {
        method: "POST",
        body: JSON.stringify({
          fromWarehouseId: values.fromWarehouseId,
          toWarehouseId: values.toWarehouseId,
          variantSku: values.variantSku.trim(),
          quantity: Number(values.quantity),
          note: values.note.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Transfer Stock</h2>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={handleSubmit((values) => transferMutation.mutate(values))}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">From Warehouse</span>
            <select {...register("fromWarehouseId")} className={INPUT_CLASS}>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.fromWarehouseId?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">To Warehouse</span>
            <select {...register("toWarehouseId")} className={INPUT_CLASS}>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.toWarehouseId?.message} />
          </label>

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

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Quantity</span>
            <input type="number" min={1} {...register("quantity")} className={INPUT_CLASS} />
            <FieldError message={errors.quantity?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Note (optional)</span>
            <input type="text" {...register("note")} className={INPUT_CLASS} />
            <FieldError message={errors.note?.message} />
          </label>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "Transferring…" : "Transfer Stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
