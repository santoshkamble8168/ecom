"use client";

import type { PageDetail, PageType, PageVersionSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import {
  PAGE_TYPE_VALUES,
  pageFormSchema,
  scheduleContentFormSchema,
  type PageFormValues,
  type ScheduleContentFormValues,
} from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";
import { fromDatetimeLocalValue } from "@/lib/datetime";
import { formatDateTime } from "@/lib/format";

import { defaultFieldsFor, PageFieldsEditor, type PageFieldsValue } from "./page-fields-editor";
import { emptySeoFields, seoFieldsFrom, seoFieldsToPayload, SeoPanel } from "./seo-panel";
import { ContentStatusBadge } from "./status-badge";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function asFieldsRecord(fields: PageFieldsValue): Record<string, unknown> {
  return fields as unknown as Record<string, unknown>;
}

export function PageForm({ pageId }: { pageId?: string }) {
  const isEditing = Boolean(pageId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!isEditing);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      type: "landing",
      slug: "",
      title: "",
      fields: asFieldsRecord(defaultFieldsFor("landing")),
      seo: emptySeoFields(),
    },
  });

  const scheduleForm = useForm<ScheduleContentFormValues>({
    resolver: zodResolver(scheduleContentFormSchema),
    defaultValues: { scheduledAt: "" },
  });

  const type = watch("type");
  const fields = watch("fields") as unknown as PageFieldsValue;
  const seo = watch("seo");
  const { onChange: onTypeChange, ...typeRegister } = register("type");

  const { data: page, isLoading, isError, error: loadError } = useQuery({
    queryKey: ["admin-page", pageId],
    queryFn: () => apiFetch<PageDetail>(`/admin/cms/pages/${pageId}`),
    enabled: isEditing,
  });

  const { data: versions } = useQuery({
    queryKey: ["admin-page-versions", pageId],
    queryFn: () => apiFetch<PageVersionSummary[]>(`/admin/cms/pages/${pageId}/versions`),
    enabled: isEditing,
  });

  useEffect(() => {
    if (page && !hydrated) {
      reset({
        type: page.type,
        slug: page.slug,
        title: page.title,
        fields: asFieldsRecord(page.fields),
        seo: seoFieldsFrom(page),
      });
      setHydrated(true);
    }
  }, [page, hydrated, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: PageFormValues) => {
      const payload = {
        type: values.type,
        slug: values.slug.trim(),
        title: values.title.trim(),
        fields: values.fields,
        ...seoFieldsToPayload(values.seo),
      };
      if (isEditing) {
        return apiFetch<PageDetail>(`/admin/cms/pages/${pageId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<PageDetail>(`/admin/cms/pages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (saved) => {
      setError(null);
      setSaveMessage("Saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      if (!isEditing) {
        router.push(`/pages/${saved.id}`);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-page", pageId] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSaveMessage(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => apiFetch<PageDetail>(`/admin/cms/pages/${pageId}/publish`, { method: "POST" }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-page", pageId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const scheduleMutation = useMutation({
    mutationFn: (values: ScheduleContentFormValues) => {
      const iso = fromDatetimeLocalValue(values.scheduledAt);
      return apiFetch<PageDetail>(`/admin/cms/pages/${pageId}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt: iso }),
      });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-page", pageId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiFetch<PageDetail>(`/admin/cms/pages/${pageId}/archive`, { method: "POST" }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-page", pageId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (isEditing && isLoading) {
    return <p className="text-neutral-500">Loading page…</p>;
  }

  if (isEditing && (isError || !page)) {
    return (
      <p className="text-danger-600">
        {loadError instanceof Error ? loadError.message : "Failed to load page."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold">
            {isEditing ? "Edit Page" : "New Page"}
          </h1>
          {page && <ContentStatusBadge status={page.status} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          className="flex flex-col gap-6 lg:col-span-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="page-type">
                  Type
                </label>
                <select
                  id="page-type"
                  disabled={isEditing}
                  {...typeRegister}
                  onChange={(event) => {
                    void onTypeChange(event);
                    setValue("fields", asFieldsRecord(defaultFieldsFor(event.target.value as PageType)));
                  }}
                  className={INPUT_CLASS}
                >
                  {PAGE_TYPE_VALUES.map((pageType) => (
                    <option key={pageType} value={pageType}>
                      {pageType}
                    </option>
                  ))}
                </select>
                {isEditing && (
                  <p className="text-xs text-neutral-500">Page type cannot be changed after creation.</p>
                )}
                <FieldError message={errors.type?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="page-slug">
                  Slug
                </label>
                <input
                  id="page-slug"
                  type="text"
                  placeholder="e.g. privacy-policy"
                  {...register("slug")}
                  className={INPUT_CLASS}
                />
                <FieldError message={errors.slug?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="page-title">
                  Title
                </label>
                <input id="page-title" type="text" {...register("title")} className={INPUT_CLASS} />
                <FieldError message={errors.title?.message} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content fields</CardTitle>
            </CardHeader>
            <CardContent>
              <PageFieldsEditor
                type={type}
                fields={fields}
                onChange={(next) => setValue("fields", asFieldsRecord(next), { shouldDirty: true })}
              />
            </CardContent>
          </Card>

          <SeoPanel value={seo} onChange={(next) => setValue("seo", next, { shouldDirty: true })} />
          <FieldError message={errors.seo?.seoTitle?.message ?? errors.seo?.seoDescription?.message} />

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
            {saveMessage && <p className="text-sm text-success-600">{saveMessage}</p>}
            {error && <p className="text-sm text-danger-600">{error}</p>}
          </div>
        </form>

        <div className="flex flex-col gap-6">
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publishing</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                >
                  {publishMutation.isPending ? "Publishing…" : "Publish now"}
                </Button>

                <form
                  className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800"
                  onSubmit={scheduleForm.handleSubmit((values) => scheduleMutation.mutate(values))}
                >
                  <label className="text-sm font-medium" htmlFor="schedule-at">
                    Schedule for
                  </label>
                  <input
                    id="schedule-at"
                    type="datetime-local"
                    {...scheduleForm.register("scheduledAt")}
                    className={INPUT_CLASS}
                  />
                  <FieldError message={scheduleForm.formState.errors.scheduledAt?.message} />
                  <Button type="submit" variant="outline" size="sm" disabled={scheduleMutation.isPending}>
                    {scheduleMutation.isPending ? "Scheduling…" : "Schedule"}
                  </Button>
                </form>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={archiveMutation.isPending}
                  onClick={() => archiveMutation.mutate()}
                >
                  {archiveMutation.isPending ? "Archiving…" : "Archive"}
                </Button>

                {actionError && <p className="text-sm text-danger-600">{actionError}</p>}

                <dl className="flex flex-col gap-1 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800">
                  <div className="flex justify-between">
                    <dt>Scheduled</dt>
                    <dd>{formatDateTime(page?.scheduledAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Published</dt>
                    <dd>{formatDateTime(page?.publishedAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Archived</dt>
                    <dd>{formatDateTime(page?.archivedAt)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Version history</CardTitle>
              </CardHeader>
              <CardContent>
                {!versions || versions.length === 0 ? (
                  <p className="text-sm text-neutral-500">No published versions yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {versions.map((version) => (
                      <li
                        key={version.id}
                        className="border-l-2 border-neutral-200 pl-3 dark:border-neutral-700"
                      >
                        <p className="font-medium">{version.title}</p>
                        <p className="text-neutral-500">{formatDateTime(version.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
