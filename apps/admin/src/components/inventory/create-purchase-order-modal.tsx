"use client";

import type { PurchaseOrderSummary, SupplierSummary, WarehouseSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { createPurchaseOrderFormSchema, type CreatePurchaseOrderFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function CreatePurchaseOrderModal({
  suppliers,
  warehouses,
  onClose,
}: {
  suppliers: SupplierSummary[];
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
  } = useForm<CreatePurchaseOrderFormValues>({
    resolver: zodResolver(createPurchaseOrderFormSchema),
    defaultValues: {
      supplierId: suppliers[0]?.id ?? "",
      warehouseId: warehouses[0]?.id ?? "",
      expectedAt: "",
      note: "",
      items: [{ variantSku: "", quantityOrdered: "", unitCost: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const createMutation = useMutation({
    mutationFn: (values: CreatePurchaseOrderFormValues) =>
      apiFetch<PurchaseOrderSummary>("/admin/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: values.supplierId,
          warehouseId: values.warehouseId,
          expectedAt: values.expectedAt || undefined,
          note: values.note.trim() || undefined,
          items: values.items.map((item) => ({
            variantSku: item.variantSku.trim(),
            quantityOrdered: Number(item.quantityOrdered),
            unitCost: item.unitCost.trim(),
          })),
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-purchase-orders"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Create Purchase Order</h2>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Supplier</span>
              <select {...register("supplierId")} className={INPUT_CLASS}>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.supplierId?.message} />
            </label>

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
              <span className="font-medium">Expected Date (optional)</span>
              <input type="date" {...register("expectedAt")} className={INPUT_CLASS} />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Note (optional)</span>
              <input type="text" {...register("note")} className={INPUT_CLASS} />
              <FieldError message={errors.note?.message} />
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Line Items</span>
              <button
                type="button"
                onClick={() => append({ variantSku: "", quantityOrdered: "", unitCost: "" })}
                className="text-sm text-brand-600 hover:underline"
              >
                + Add item
              </button>
            </div>
            <FieldError message={errors.items?.root?.message ?? errors.items?.message} />
            <div className="flex flex-col gap-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-end gap-2 rounded-md border border-neutral-200 p-2 dark:border-neutral-800"
                >
                  <div className="min-w-[14rem] flex-1">
                    <Controller
                      name={`items.${index}.variantSku`}
                      control={control}
                      render={({ field }) => (
                        <VariantSearchField
                          label="SKU"
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.items?.[index]?.variantSku?.message}
                        />
                      )}
                    />
                  </div>
                  <label className="flex flex-col gap-1 text-xs">
                    <span>Qty Ordered</span>
                    <input
                      type="number"
                      min={1}
                      {...register(`items.${index}.quantityOrdered`)}
                      className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <FieldError message={errors.items?.[index]?.quantityOrdered?.message} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span>Unit Cost</span>
                    <input
                      type="text"
                      placeholder="299.00"
                      {...register(`items.${index}.unitCost`)}
                      className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <FieldError message={errors.items?.[index]?.unitCost?.message} />
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
