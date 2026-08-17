"use client";

import type { WarehouseSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { createWarehouseFormSchema, type CreateWarehouseFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { WarehouseEditModal } from "@/components/inventory/warehouse-edit-modal";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const EMPTY_WAREHOUSE: CreateWarehouseFormValues = {
  code: "",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  isDefault: false,
};

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseSummary | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWarehouseFormValues>({
    resolver: zodResolver(createWarehouseFormSchema),
    defaultValues: EMPTY_WAREHOUSE,
  });

  const { data: warehouses, isLoading, isError } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: () => apiFetch<WarehouseSummary[]>("/admin/warehouses"),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateWarehouseFormValues) =>
      apiFetch<WarehouseSummary>("/admin/warehouses", {
        method: "POST",
        body: JSON.stringify({
          code: values.code.trim(),
          name: values.name.trim(),
          line1: values.line1.trim(),
          line2: values.line2.trim() || undefined,
          city: values.city.trim(),
          state: values.state.trim(),
          postalCode: values.postalCode.trim(),
          country: values.country.trim() || undefined,
          isDefault: values.isDefault,
        }),
      }),
    onSuccess: () => {
      reset(EMPTY_WAREHOUSE);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Inventory · Warehouses</h1>
        <Link href="/inventory" className="text-sm text-brand-600 hover:underline">
          ← Back to stock
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Code</span>
              <input type="text" {...register("code")} className={INPUT_CLASS} />
              <FieldError message={errors.code?.message} />
            </label>
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
            <label className="flex flex-col gap-1 text-sm">
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
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Warehouse"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading warehouses…</p>}
      {isError && <p className="text-danger-600">Failed to load warehouses.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-left font-semibold">Default</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {warehouses?.map((warehouse) => (
                <tr key={warehouse.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{warehouse.code}</td>
                  <td className="px-4 py-3">{warehouse.name}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {warehouse.city}, {warehouse.state}, {warehouse.country}
                  </td>
                  <td className="px-4 py-3">{warehouse.isDefault ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{warehouse.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setEditingWarehouse(warehouse)}
                      className="text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {warehouses?.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No warehouses yet. Create one above.</p>
          )}
        </div>
      )}

      {editingWarehouse && (
        <WarehouseEditModal warehouse={editingWarehouse} onClose={() => setEditingWarehouse(null)} />
      )}
    </div>
  );
}
