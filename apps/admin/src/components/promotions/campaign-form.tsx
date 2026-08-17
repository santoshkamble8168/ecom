"use client";

import type { UpsertCampaignInput } from "@ecom/types";
import { Button } from "@ecom/ui";
import {
  CAMPAIGN_TYPE_VALUES,
  COUPON_TYPE_VALUES,
  campaignFormSchema,
  type CampaignFormValues,
} from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function buildInitialValues(initial?: Partial<UpsertCampaignInput>): CampaignFormValues {
  return {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    type: initial?.type ?? "sitewide",
    discountType: initial?.discountType ?? "",
    discountValue: initial?.discountValue ?? "",
    startsAt: toDatetimeLocalValue(initial?.startsAt ?? null),
    endsAt: toDatetimeLocalValue(initial?.endsAt ?? null),
    isActive: initial?.isActive ?? true,
  };
}

export function campaignFormValuesToInput(values: CampaignFormValues): UpsertCampaignInput {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    type: values.type,
    discountType: values.discountType || null,
    discountValue: values.discountValue.trim() || null,
    startsAt: fromDatetimeLocalValue(values.startsAt) ?? "",
    endsAt: fromDatetimeLocalValue(values.endsAt) ?? "",
    isActive: values.isActive,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CampaignFormProps {
  initial?: Partial<UpsertCampaignInput>;
  submitLabel: string;
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (input: UpsertCampaignInput) => void;
  /** When true (create flow), editing the name auto-fills an empty/matching slug. */
  autoSlug?: boolean;
}

export function CampaignForm({
  initial,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  autoSlug,
}: CampaignFormProps) {
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: buildInitialValues(initial),
  });

  const discountType = watch("discountType");
  const { onChange: onNameChange, ...nameRegister } = register("name");
  const { onChange: onSlugChange, ...slugRegister } = register("slug");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => onSubmit(campaignFormValuesToInput(values)))}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="campaign-name" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Name
          </label>
          <input
            id="campaign-name"
            type="text"
            {...nameRegister}
            onChange={(event) => {
              void onNameChange(event);
              if (autoSlug && !slugTouched) {
                setValue("slug", slugify(event.target.value), { shouldValidate: true });
              }
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "campaign-name-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="campaign-name-error" message={errors.name?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campaign-slug" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Slug
          </label>
          <input
            id="campaign-slug"
            type="text"
            {...slugRegister}
            onChange={(event) => {
              setSlugTouched(true);
              void onSlugChange(event);
            }}
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? "campaign-slug-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="campaign-slug-error" message={errors.slug?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campaign-type" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Type
          </label>
          <select id="campaign-type" {...register("type")} className={INPUT_CLASS}>
            {CAMPAIGN_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <FieldError message={errors.type?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="campaign-discount-type"
            className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            Discount type
          </label>
          <select id="campaign-discount-type" {...register("discountType")} className={INPUT_CLASS}>
            <option value="">None</option>
            {COUPON_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <FieldError message={errors.discountType?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="campaign-discount-value"
            className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            Discount value
          </label>
          <input
            id="campaign-discount-value"
            type="text"
            placeholder="0.00"
            disabled={!discountType}
            {...register("discountValue")}
            aria-invalid={Boolean(errors.discountValue)}
            aria-describedby={errors.discountValue ? "campaign-discount-value-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="campaign-discount-value-error" message={errors.discountValue?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campaign-starts-at" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Starts at
          </label>
          <input
            id="campaign-starts-at"
            type="datetime-local"
            {...register("startsAt")}
            aria-invalid={Boolean(errors.startsAt)}
            aria-describedby={errors.startsAt ? "campaign-starts-at-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="campaign-starts-at-error" message={errors.startsAt?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campaign-ends-at" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Ends at
          </label>
          <input
            id="campaign-ends-at"
            type="datetime-local"
            {...register("endsAt")}
            aria-invalid={Boolean(errors.endsAt)}
            aria-describedby={errors.endsAt ? "campaign-ends-at-error" : undefined}
            className={INPUT_CLASS}
          />
          <FieldError id="campaign-ends-at-error" message={errors.endsAt?.message} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          {...register("isActive")}
          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
        />
        Active
      </label>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </form>
  );
}
