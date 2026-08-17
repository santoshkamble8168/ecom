"use client";

import type { UpsertCouponInput } from "@ecom/types";
import { Button } from "@ecom/ui";
import { couponFormSchema, COUPON_TYPE_VALUES, type CouponFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";

const COUPON_TYPES = COUPON_TYPE_VALUES;

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function idsToText(ids: string[] | undefined): string {
  return (ids ?? []).join(", ");
}

function textToIds(text: string): string[] {
  return text
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function buildInitialValues(initial?: Partial<UpsertCouponInput>): CouponFormValues {
  return {
    code: initial?.code ?? "",
    description: initial?.description ?? "",
    type: initial?.type ?? "percent",
    value: initial?.value ?? "",
    minCartValue: initial?.minCartValue ?? "",
    maxUses: initial?.maxUses != null ? String(initial.maxUses) : "",
    perUserLimit: initial?.perUserLimit != null ? String(initial.perUserLimit) : "",
    combinable: initial?.combinable ?? false,
    eligibleCategoryIds: idsToText(initial?.eligibleCategoryIds),
    eligibleCollectionIds: idsToText(initial?.eligibleCollectionIds),
    expiresAt: toDatetimeLocalValue(initial?.expiresAt ?? null),
    isActive: initial?.isActive ?? true,
  };
}

export function couponFormValuesToInput(values: CouponFormValues): UpsertCouponInput {
  return {
    code: values.code.trim(),
    description: values.description.trim() || undefined,
    type: values.type,
    value: values.value.trim(),
    minCartValue: values.minCartValue.trim() || null,
    maxUses: values.maxUses.trim() ? Number(values.maxUses) : null,
    perUserLimit: values.perUserLimit.trim() ? Number(values.perUserLimit) : null,
    combinable: values.combinable,
    eligibleCategoryIds: textToIds(values.eligibleCategoryIds),
    eligibleCollectionIds: textToIds(values.eligibleCollectionIds),
    expiresAt: fromDatetimeLocalValue(values.expiresAt),
    isActive: values.isActive,
  };
}

interface CouponFormProps {
  initial?: Partial<UpsertCouponInput>;
  submitLabel: string;
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (input: UpsertCouponInput) => void;
}

export function CouponForm({ initial, submitLabel, isSubmitting, error, onSubmit }: CouponFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: buildInitialValues(initial),
  });

  const type = watch("type");
  const { onChange: onCodeChange, ...codeRegister } = register("code");

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => onSubmit(couponFormValuesToInput(values)))}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="coupon-code" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Code
          </label>
          <input
            id="coupon-code"
            type="text"
            {...codeRegister}
            onChange={(event) => {
              event.target.value = event.target.value.toUpperCase();
              void onCodeChange(event);
            }}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? "coupon-code-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="coupon-code-error" message={errors.code?.message} />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="coupon-description" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Description
          </label>
          <input
            id="coupon-description"
            type="text"
            {...register("description")}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "coupon-description-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="coupon-description-error" message={errors.description?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="coupon-type" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Type
          </label>
          <select id="coupon-type" {...register("type")} className={INPUT_CLASS}>
            {COUPON_TYPES.map((couponType) => (
              <option key={couponType} value={couponType}>
                {couponType.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <FieldError message={errors.type?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="coupon-value" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Value{" "}
            {type === "percent"
              ? "(%)"
              : type === "fixed"
                ? "(amount)"
                : "(unused for free shipping, enter 0)"}
          </label>
          <input
            id="coupon-value"
            type="text"
            placeholder="0.00"
            {...register("value")}
            aria-invalid={Boolean(errors.value)}
            aria-describedby={errors.value ? "coupon-value-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="coupon-value-error" message={errors.value?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="coupon-min-cart" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Min cart value
          </label>
          <input
            id="coupon-min-cart"
            type="text"
            placeholder="Optional"
            {...register("minCartValue")}
            aria-invalid={Boolean(errors.minCartValue)}
            aria-describedby={errors.minCartValue ? "coupon-min-cart-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="coupon-min-cart-error" message={errors.minCartValue?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="coupon-max-uses" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Max uses (total)
          </label>
          <input
            id="coupon-max-uses"
            type="number"
            min={1}
            placeholder="Unlimited"
            {...register("maxUses")}
            aria-invalid={Boolean(errors.maxUses)}
            aria-describedby={errors.maxUses ? "coupon-max-uses-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="coupon-max-uses-error" message={errors.maxUses?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="coupon-per-user-limit" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Per-user limit
          </label>
          <input
            id="coupon-per-user-limit"
            type="number"
            min={1}
            placeholder="Unlimited"
            {...register("perUserLimit")}
            aria-invalid={Boolean(errors.perUserLimit)}
            aria-describedby={errors.perUserLimit ? "coupon-per-user-limit-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="coupon-per-user-limit-error" message={errors.perUserLimit?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="coupon-expires-at" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Expires at
          </label>
          <input
            id="coupon-expires-at"
            type="datetime-local"
            {...register("expiresAt")}
            className={INPUT_CLASS}
          />
          <FieldError message={errors.expiresAt?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="coupon-eligible-categories"
            className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            Eligible category IDs (comma-separated, empty = all)
          </label>
          <input
            id="coupon-eligible-categories"
            type="text"
            placeholder="catId1, catId2"
            {...register("eligibleCategoryIds")}
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="coupon-eligible-collections"
            className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            Eligible collection IDs (comma-separated, empty = all)
          </label>
          <input
            id="coupon-eligible-collections"
            type="text"
            placeholder="colId1, colId2"
            {...register("eligibleCollectionIds")}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("combinable")}
            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
          />
          Combinable with other coupons
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("isActive")}
            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
          />
          Active
        </label>
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </form>
  );
}
