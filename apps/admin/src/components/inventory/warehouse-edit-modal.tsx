"use client";

import type { WarehouseSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { updateWarehouseFormSchema, type UpdateWarehouseFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function WarehouseEditModal({
  warehouse,
  onClose,
}: {
  warehouse: WarehouseSummary;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateWarehouseFormValues>({
    resolver: zodResolver(updateWarehouseFormSchema),
    defaultValues: {
      name: warehouse.name,
      line1: warehouse.line1,
      line2: warehouse.line2 ?? "",
      city: warehouse.city,
      state: warehouse.state,
      postalCode: warehouse.postalCode,
      country: warehouse.country,
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: UpdateWarehouseFormValues) =>
      apiFetch<WarehouseSummary>(`/admin/warehouses/${warehouse.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name.trim(),
          line1: values.line1.trim(),
          line2: values.line2.trim() || undefined,
          city: values.city.trim(),
          state: values.state.trim(),
          postalCode: values.postalCode.trim(),
          country: values.country.trim(),
          isDefault: values.isDefault,
          isActive: values.isActive,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Edit Warehouse — {warehouse.code}</h2>
        <form
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
        >
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Name</span>
            <input type="text" {...register("name")} className={INPUT_CLASS} />
            <FieldError message={errors.name?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Address Line 1</span>
            <input type="text" {...register("line1")} className={INPUT_CLASS} />
            <FieldError message={errors.line1?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Address Line 2 (optional)</span>
            <input type="text" {...register("line2")} className={INPUT_CLASS} />
            <FieldError message={errors.line2?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">City</span>
            <input type="text" {...register("city")} className={INPUT_CLASS} />
            <FieldError message={errors.city?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">State</span>
            <input type="text" {...register("state")} className={INPUT_CLASS} />
            <FieldError message={errors.state?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Postal Code</span>
            <input type="text" {...register("postalCode")} className={INPUT_CLASS} />
            <FieldError message={errors.postalCode?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Country</span>
            <input type="text" maxLength={2} {...register("country")} className={INPUT_CLASS} />
            <FieldError message={errors.country?.message} />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register("isDefault")}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            Default warehouse
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register("isActive")}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            Active
          </label>

          {error && <p className="text-sm text-danger-600 sm:col-span-2">{error}</p>}

          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
