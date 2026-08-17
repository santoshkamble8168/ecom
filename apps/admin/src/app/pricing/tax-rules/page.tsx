"use client";

import type { TaxRuleSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { createTaxRuleFormSchema, type CreateTaxRuleFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { TaxRuleEditModal } from "@/components/pricing/tax-rule-edit-modal";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const EMPTY_TAX_RULE: CreateTaxRuleFormValues = {
  name: "",
  ratePercent: "",
  appliesTo: "all",
  categoryId: "",
  priority: "0",
};

export default function TaxRulesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [editingTaxRule, setEditingTaxRule] = useState<TaxRuleSummary | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaxRuleFormValues>({
    resolver: zodResolver(createTaxRuleFormSchema),
    defaultValues: EMPTY_TAX_RULE,
  });

  const { data: taxRules, isLoading, isError } = useQuery({
    queryKey: ["admin-tax-rules"],
    queryFn: () => apiFetch<TaxRuleSummary[]>("/admin/tax-rules"),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateTaxRuleFormValues) =>
      apiFetch<TaxRuleSummary>("/admin/tax-rules", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          rate: (Number(values.ratePercent) / 100).toFixed(4),
          appliesTo: values.appliesTo.trim() || undefined,
          categoryId: values.categoryId.trim() || undefined,
          priority: values.priority ? Number(values.priority) : undefined,
        }),
      }),
    onSuccess: () => {
      reset(EMPTY_TAX_RULE);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-tax-rules"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Pricing · Tax Rules</h1>
        <Link href="/pricing" className="text-sm text-brand-600 hover:underline">
          ← Back to prices
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Tax Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
              <span className="font-medium">Name</span>
              <input type="text" placeholder="GST Apparel (5%)" {...register("name")} className={INPUT_CLASS} />
              <FieldError message={errors.name?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Rate (%)</span>
              <input type="number" step="0.01" min={0} placeholder="5" {...register("ratePercent")} className={INPUT_CLASS} />
              <FieldError message={errors.ratePercent?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Applies To</span>
              <input type="text" placeholder="all" {...register("appliesTo")} className={INPUT_CLASS} />
              <FieldError message={errors.appliesTo?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Category ID (optional)</span>
              <input
                type="text"
                placeholder="Leave blank for a sitewide rule"
                {...register("categoryId")}
                className={INPUT_CLASS}
              />
              <FieldError message={errors.categoryId?.message} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Priority</span>
              <input type="number" {...register("priority")} className={INPUT_CLASS} />
              <FieldError message={errors.priority?.message} />
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Tax Rule"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading tax rules…</p>}
      {isError && <p className="text-danger-600">Failed to load tax rules.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Rate</th>
                <th className="px-4 py-3 text-left font-semibold">Applies To</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Priority</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {taxRules?.map((taxRule) => (
                <tr key={taxRule.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3">{taxRule.name}</td>
                  <td className="px-4 py-3">{(Number(taxRule.rate) * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 capitalize">{taxRule.appliesTo}</td>
                  <td className="px-4 py-3 text-neutral-500">{taxRule.categoryName ?? "Sitewide"}</td>
                  <td className="px-4 py-3">{taxRule.priority}</td>
                  <td className="px-4 py-3">{taxRule.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setEditingTaxRule(taxRule)}
                      className="text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {taxRules?.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No tax rules yet. Create one above.</p>
          )}
        </div>
      )}

      {editingTaxRule && (
        <TaxRuleEditModal taxRule={editingTaxRule} onClose={() => setEditingTaxRule(null)} />
      )}
    </div>
  );
}
