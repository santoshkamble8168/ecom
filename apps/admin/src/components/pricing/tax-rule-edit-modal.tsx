"use client";

import type { TaxRuleSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { taxRuleFormSchema, type TaxRuleFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function TaxRuleEditModal({ taxRule, onClose }: { taxRule: TaxRuleSummary; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaxRuleFormValues>({
    resolver: zodResolver(taxRuleFormSchema),
    defaultValues: {
      name: taxRule.name,
      ratePercent: String(Number(taxRule.rate) * 100),
      appliesTo: taxRule.appliesTo,
      categoryId: taxRule.categoryId ?? "",
      priority: String(taxRule.priority),
      isActive: taxRule.isActive,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: TaxRuleFormValues) =>
      apiFetch<TaxRuleSummary>(`/admin/tax-rules/${taxRule.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name.trim(),
          rate: (Number(values.ratePercent) / 100).toFixed(4),
          appliesTo: values.appliesTo.trim() || undefined,
          categoryId: values.categoryId.trim() || null,
          priority: values.priority ? Number(values.priority) : undefined,
          isActive: values.isActive,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tax-rules"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Edit Tax Rule</h2>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input type="text" {...register("name")} className={INPUT_CLASS} />
            <FieldError message={errors.name?.message} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Rate (%)</span>
            <input type="number" step="0.01" min={0} {...register("ratePercent")} className={INPUT_CLASS} />
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register("isActive")}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            Active
          </label>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
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
