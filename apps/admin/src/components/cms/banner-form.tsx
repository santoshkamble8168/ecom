"use client";

import type { BannerSummary, UpsertBannerInput } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { BANNER_PLACEMENT_VALUES, bannerFormSchema, type BannerFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/datetime";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function BannerForm({
  banner,
  onDone,
}: {
  banner: BannerSummary | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      title: banner?.title ?? "",
      imageUrl: banner?.imageUrl ?? "",
      mobileImageUrl: banner?.mobileImageUrl ?? "",
      linkUrl: banner?.linkUrl ?? "",
      altText: banner?.altText ?? "",
      placement: banner?.placement ?? "homepage_hero",
      sortOrder: String(banner?.sortOrder ?? 0),
      startsAt: toDatetimeLocalValue(banner?.startsAt ?? null),
      endsAt: toDatetimeLocalValue(banner?.endsAt ?? null),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: BannerFormValues) => {
      const payload: UpsertBannerInput = {
        title: values.title.trim(),
        imageUrl: values.imageUrl.trim(),
        mobileImageUrl: values.mobileImageUrl.trim() || undefined,
        linkUrl: values.linkUrl.trim() || undefined,
        altText: values.altText.trim() || undefined,
        placement: values.placement,
        sortOrder: Number(values.sortOrder) || 0,
        startsAt: fromDatetimeLocalValue(values.startsAt) ?? undefined,
        endsAt: fromDatetimeLocalValue(values.endsAt) ?? undefined,
      };
      if (banner) {
        return apiFetch<BannerSummary>(`/admin/cms/banners/${banner.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<BannerSummary>(`/admin/cms/banners`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{banner ? "Edit banner" : "New banner"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="banner-title">
              Title
            </label>
            <input id="banner-title" type="text" {...register("title")} className={INPUT_CLASS} />
            <FieldError message={errors.title?.message} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="banner-image">
              Image URL
            </label>
            <input id="banner-image" type="text" {...register("imageUrl")} className={INPUT_CLASS} />
            <FieldError message={errors.imageUrl?.message} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="banner-mobile-image">
              Mobile image URL (optional)
            </label>
            <input id="banner-mobile-image" type="text" {...register("mobileImageUrl")} className={INPUT_CLASS} />
            <FieldError message={errors.mobileImageUrl?.message} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="banner-link">
              Link URL (optional)
            </label>
            <input id="banner-link" type="text" {...register("linkUrl")} className={INPUT_CLASS} />
            <FieldError message={errors.linkUrl?.message} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="banner-alt">
              Alt text (optional, for accessibility)
            </label>
            <input id="banner-alt" type="text" {...register("altText")} className={INPUT_CLASS} />
            <FieldError message={errors.altText?.message} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="banner-placement">
              Placement
            </label>
            <select id="banner-placement" {...register("placement")} className={INPUT_CLASS}>
              {BANNER_PLACEMENT_VALUES.map((placement) => (
                <option key={placement} value={placement}>
                  {placement.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <FieldError message={errors.placement?.message} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="banner-sort-order">
              Sort order
            </label>
            <input id="banner-sort-order" type="number" min={0} {...register("sortOrder")} className={INPUT_CLASS} />
            <FieldError message={errors.sortOrder?.message} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="banner-starts-at">
                Starts at (optional)
              </label>
              <input id="banner-starts-at" type="datetime-local" {...register("startsAt")} className={INPUT_CLASS} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="banner-ends-at">
                Ends at (optional)
              </label>
              <input id="banner-ends-at" type="datetime-local" {...register("endsAt")} className={INPUT_CLASS} />
              <FieldError message={errors.endsAt?.message} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : banner ? "Save changes" : "Create banner"}
            </Button>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
