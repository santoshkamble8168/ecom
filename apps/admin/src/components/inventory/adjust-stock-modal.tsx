"use client";

import type { StockItemSummary, WarehouseSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { stockAdjustmentFormSchema, type StockAdjustmentFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function AdjustStockModal({
  warehouses,
  onClose,
}: {
  warehouses: WarehouseSummary[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: {
      warehouseId: warehouses[0]?.id ?? "",
      variantSku: "",
      delta: "",
      note: "",
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (values: StockAdjustmentFormValues) =>
      apiFetch<StockItemSummary>("/admin/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          warehouseId: values.warehouseId,
          variantSku: values.variantSku.trim(),
          delta: Number(values.delta),
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
        <h2 className="text-lg font-semibold">Adjust Stock</h2>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={handleSubmit((values) => adjustMutation.mutate(values))}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Warehouse</span>
            <select {...register("warehouseId")} className={INPUT_CLASS}>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.warehouseId?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Variant SKU</span>
            <input type="text" {...register("variantSku")} className={INPUT_CLASS} />
            <FieldError message={errors.variantSku?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Delta (positive to add, negative to remove)</span>
            <input type="number" {...register("delta")} className={INPUT_CLASS} />
            <FieldError message={errors.delta?.message} />
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
            <Button type="submit" disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? "Adjusting…" : "Adjust Stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
