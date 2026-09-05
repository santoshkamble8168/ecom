"use client";

import type { SupplierSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { createSupplierFormSchema, type CreateSupplierFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const EMPTY_SUPPLIER: CreateSupplierFormValues = { name: "", email: "", phone: "" };

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierFormSchema),
    defaultValues: EMPTY_SUPPLIER,
  });

  const { data: suppliers, isLoading, isError } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: () => apiFetch<SupplierSummary[]>("/admin/suppliers"),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateSupplierFormValues) =>
      apiFetch<SupplierSummary>("/admin/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim() || undefined,
          phone: values.phone.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      reset(EMPTY_SUPPLIER);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Inventory · Suppliers</h1>
        <Link href="/inventory" className="text-sm text-brand-600 hover:underline">
          ← Back to stock
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Name</span>
              <input type="text" {...register("name")} className={INPUT_CLASS} />
              <FieldError message={errors.name?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Email (optional)</span>
              <input type="email" {...register("email")} className={INPUT_CLASS} />
              <FieldError message={errors.email?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Phone (optional)</span>
              <input type="text" {...register("phone")} className={INPUT_CLASS} />
              <FieldError message={errors.phone?.message} />
            </label>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Supplier"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && <p className="text-danger-600">Failed to load suppliers.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {suppliers?.map((supplier) => (
                <tr key={supplier.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3">{supplier.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{supplier.email ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{supplier.phone ?? "—"}</td>
                  <td className="px-4 py-3">{supplier.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(supplier.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {suppliers?.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No suppliers yet. Create one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
