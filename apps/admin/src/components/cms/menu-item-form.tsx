"use client";

import type { MenuItemSummary, UpsertMenuItemInput } from "@ecom/types";
import { Button } from "@ecom/ui";
import { menuItemFormSchema, type MenuItemFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function MenuItemForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  initial?: Partial<MenuItemSummary>;
  submitLabel: string;
  onSubmit: (payload: UpsertMenuItemInput) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      label: initial?.label ?? "",
      url: initial?.url ?? "",
      sortOrder: String(initial?.sortOrder ?? 0),
      opensInNewTab: initial?.opensInNewTab ?? false,
      isActive: initial?.isActive ?? true,
    },
  });

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-700"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          label: values.label.trim(),
          url: values.url.trim(),
          sortOrder: Number(values.sortOrder) || 0,
          opensInNewTab: values.opensInNewTab,
          isActive: values.isActive,
        }),
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Label</label>
          <input type="text" {...register("label")} className={INPUT_CLASS} />
          <FieldError message={errors.label?.message} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">URL</label>
          <input type="text" {...register("url")} className={INPUT_CLASS} />
          <FieldError message={errors.url?.message} />
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Sort order</label>
          <input type="number" min={0} {...register("sortOrder")} className={INPUT_CLASS} />
          <FieldError message={errors.sortOrder?.message} />
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("opensInNewTab")} />
          Opens in new tab
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("isActive")} />
          Active
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </form>
  );
}
