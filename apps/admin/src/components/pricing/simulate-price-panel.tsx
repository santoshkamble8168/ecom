"use client";

import type { PriceSimulationResult } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { simulatePriceFormSchema, type SimulatePriceFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function SimulatePricePanel() {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SimulatePriceFormValues>({
    resolver: zodResolver(simulatePriceFormSchema),
    defaultValues: { variantSku: "", quantity: "1", couponCode: "" },
  });

  const simulateMutation = useMutation({
    mutationFn: (values: SimulatePriceFormValues) =>
      apiFetch<PriceSimulationResult>("/admin/prices/simulate", {
        method: "POST",
        body: JSON.stringify({
          variantSku: values.variantSku.trim(),
          quantity: values.quantity.trim() ? Number(values.quantity) : undefined,
          couponCode: values.couponCode.trim() || undefined,
        }),
      }),
    onError: (err: Error) => setError(err.message),
    onSuccess: () => setError(null),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Simulate Price</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={handleSubmit((values) => simulateMutation.mutate(values))}
        >
          <div className="min-w-[16rem]">
            <Controller
              name="variantSku"
              control={control}
              render={({ field }) => (
                <VariantSearchField
                  label="SKU"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.variantSku?.message}
                />
              )}
            />
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Qty</span>
            <input type="number" min={1} {...register("quantity")} className={`w-20 ${INPUT_CLASS}`} />
            <FieldError message={errors.quantity?.message} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Coupon (optional)</span>
            <input type="text" {...register("couponCode")} className={`w-40 ${INPUT_CLASS}`} />
          </label>
          <Button type="submit" disabled={simulateMutation.isPending}>
            {simulateMutation.isPending ? "Simulating…" : "Simulate"}
          </Button>
        </form>

        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

        {simulateMutation.data && (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <dt className="text-neutral-500">MRP</dt>
            <dd>{formatCurrency(simulateMutation.data.mrp)}</dd>
            <dt className="text-neutral-500">Selling Price</dt>
            <dd>{formatCurrency(simulateMutation.data.sellingPrice)}</dd>
            <dt className="text-neutral-500">Effective Price</dt>
            <dd>{formatCurrency(simulateMutation.data.effectivePrice)}</dd>
            <dt className="text-neutral-500">Quantity</dt>
            <dd>{simulateMutation.data.quantity}</dd>
            <dt className="text-neutral-500">Subtotal</dt>
            <dd>{formatCurrency(simulateMutation.data.subtotal)}</dd>
            <dt className="text-neutral-500">Discount</dt>
            <dd>{formatCurrency(simulateMutation.data.discount)}</dd>
            <dt className="text-neutral-500">Tax Rate</dt>
            <dd>{(Number(simulateMutation.data.taxRate) * 100).toFixed(2)}%</dd>
            <dt className="text-neutral-500">Tax Amount</dt>
            <dd>{formatCurrency(simulateMutation.data.taxAmount)}</dd>
            <dt className="text-neutral-500">Total</dt>
            <dd className="font-medium">{formatCurrency(simulateMutation.data.total)}</dd>
            <dt className="text-neutral-500">Coupon Applied</dt>
            <dd>{simulateMutation.data.couponApplied ?? "—"}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
