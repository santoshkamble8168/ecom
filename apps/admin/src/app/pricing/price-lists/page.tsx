"use client";

import type { PriceListSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { createPriceListFormSchema, type CreatePriceListFormValues } from "@ecom/validation";
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

const EMPTY_PRICE_LIST: CreatePriceListFormValues = {
  code: "",
  name: "",
  currency: "INR",
  isDefault: false,
};

export default function PriceListsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePriceListFormValues>({
    resolver: zodResolver(createPriceListFormSchema),
    defaultValues: EMPTY_PRICE_LIST,
  });

  const { data: priceLists, isLoading, isError } = useQuery({
    queryKey: ["admin-price-lists"],
    queryFn: () => apiFetch<PriceListSummary[]>("/admin/price-lists"),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreatePriceListFormValues) =>
      apiFetch<PriceListSummary>("/admin/price-lists", {
        method: "POST",
        body: JSON.stringify({
          code: values.code.trim(),
          name: values.name.trim(),
          currency: values.currency.trim() || undefined,
          isDefault: values.isDefault,
        }),
      }),
    onSuccess: () => {
      reset(EMPTY_PRICE_LIST);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-price-lists"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Pricing · Price Lists</h1>
        <Link href="/pricing" className="text-sm text-brand-600 hover:underline">
          ← Back to prices
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Price List</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Code</span>
              <input type="text" placeholder="default-inr" {...register("code")} className={INPUT_CLASS} />
              <FieldError message={errors.code?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Name</span>
              <input type="text" placeholder="Default (INR)" {...register("name")} className={INPUT_CLASS} />
              <FieldError message={errors.name?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Currency</span>
              <input type="text" maxLength={3} {...register("currency")} className={`w-24 ${INPUT_CLASS}`} />
              <FieldError message={errors.currency?.message} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register("isDefault")}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              Default price list
            </label>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Price List"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && <p className="text-danger-600">Failed to load price lists.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Currency</th>
                <th className="px-4 py-3 text-left font-semibold">Default</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {priceLists?.map((priceList) => (
                <tr key={priceList.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{priceList.code}</td>
                  <td className="px-4 py-3">{priceList.name}</td>
                  <td className="px-4 py-3">{priceList.currency}</td>
                  <td className="px-4 py-3">{priceList.isDefault ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{priceList.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(priceList.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {priceLists?.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No price lists yet. Create one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
