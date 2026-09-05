"use client";

import type { BlogPostDetail, UpsertBlogPostInput } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import {
  blogPostFormSchema,
  scheduleContentFormSchema,
  type BlogPostFormValues,
  type ScheduleContentFormValues,
} from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { emptySeoFields, seoFieldsFrom, seoFieldsToPayload, SeoPanel } from "@/components/cms/seo-panel";
import { ContentStatusBadge } from "@/components/cms/status-badge";
import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";
import { fromDatetimeLocalValue } from "@/lib/datetime";
import { formatDateTime } from "@/lib/format";

import { CategoryPicker, TagPicker } from "./category-tag-picker";
import { AdminFormSkeleton } from "@/components/layout/admin-skeleton";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function PostForm({ postId }: { postId?: string }) {
  const isEditing = Boolean(postId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [relatedSkuQuery, setRelatedSkuQuery] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostFormSchema),
    defaultValues: {
      slug: "",
      title: "",
      excerpt: "",
      coverImageUrl: "",
      authorName: "",
      contentHtml: "",
      relatedSkus: "",
      categoryIds: [],
      tagIds: [],
      seo: emptySeoFields(),
    },
  });

  const scheduleForm = useForm<ScheduleContentFormValues>({
    resolver: zodResolver(scheduleContentFormSchema),
    defaultValues: { scheduledAt: "" },
  });

  const seo = watch("seo");
  const categoryIds = watch("categoryIds");
  const tagIds = watch("tagIds");
  const relatedSkus = watch("relatedSkus");

  const { data: post, isLoading, isError, error: loadError } = useQuery({
    queryKey: ["admin-blog-post", postId],
    queryFn: () => apiFetch<BlogPostDetail>(`/admin/blog/posts/${postId}`),
    enabled: isEditing,
  });

  useEffect(() => {
    if (post && !hydrated) {
      reset({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? "",
        coverImageUrl: post.coverImageUrl ?? "",
        authorName: post.authorName,
        contentHtml: post.contentHtml,
        relatedSkus: post.relatedProductSkus.join(", "),
        categoryIds: post.categories.map((category) => category.id),
        tagIds: post.tags.map((tag) => tag.id),
        seo: seoFieldsFrom(post),
      });
      setHydrated(true);
    }
  }, [post, hydrated, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: BlogPostFormValues) => {
      const payload: UpsertBlogPostInput = {
        slug: values.slug.trim(),
        title: values.title.trim(),
        excerpt: values.excerpt.trim() || undefined,
        coverImageUrl: values.coverImageUrl.trim() || undefined,
        authorName: values.authorName.trim(),
        contentHtml: values.contentHtml,
        categoryIds: values.categoryIds,
        tagIds: values.tagIds,
        relatedProductSkus: values.relatedSkus
          .split(",")
          .map((sku) => sku.trim())
          .filter(Boolean),
        ...seoFieldsToPayload(values.seo),
      };
      if (isEditing) {
        return apiFetch<BlogPostDetail>(`/admin/blog/posts/${postId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<BlogPostDetail>(`/admin/blog/posts`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (saved) => {
      setError(null);
      setSaveMessage("Saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      if (!isEditing) {
        router.push(`/blog/${saved.id}`);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-post", postId] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSaveMessage(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => apiFetch<BlogPostDetail>(`/admin/blog/posts/${postId}/publish`, { method: "POST" }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-post", postId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const scheduleMutation = useMutation({
    mutationFn: (values: ScheduleContentFormValues) => {
      const iso = fromDatetimeLocalValue(values.scheduledAt);
      return apiFetch<BlogPostDetail>(`/admin/blog/posts/${postId}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt: iso }),
      });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-post", postId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (isEditing && isLoading) {
    return <AdminFormSkeleton />;
  }

  if (isEditing && (isError || !post)) {
    return (
      <p className="text-danger-600">
        {loadError instanceof Error ? loadError.message : "Failed to load post."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold">
            {isEditing ? "Edit Blog Post" : "New Blog Post"}
          </h1>
          {post && <ContentStatusBadge status={post.status} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          className="flex flex-col gap-6 lg:col-span-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="post-slug">
                  Slug
                </label>
                <input
                  id="post-slug"
                  type="text"
                  placeholder="e.g. styling-oversized-tees"
                  {...register("slug")}
                  className={INPUT_CLASS}
                />
                <FieldError message={errors.slug?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="post-title">
                  Title
                </label>
                <input id="post-title" type="text" {...register("title")} className={INPUT_CLASS} />
                <FieldError message={errors.title?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="post-excerpt">
                  Excerpt
                </label>
                <textarea id="post-excerpt" rows={2} {...register("excerpt")} className={INPUT_CLASS} />
                <FieldError message={errors.excerpt?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="post-cover">
                  Cover image URL
                </label>
                <input id="post-cover" type="text" {...register("coverImageUrl")} className={INPUT_CLASS} />
                <FieldError message={errors.coverImageUrl?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="post-author">
                  Author name
                </label>
                <input id="post-author" type="text" {...register("authorName")} className={INPUT_CLASS} />
                <FieldError message={errors.authorName?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="post-content">
                  Content (HTML)
                </label>
                <textarea
                  id="post-content"
                  rows={14}
                  {...register("contentHtml")}
                  className={`${INPUT_CLASS} font-mono`}
                />
                <FieldError message={errors.contentHtml?.message} />
              </div>

              <div className="flex flex-col gap-2">
                <VariantSearchField
                  id="post-related-skus"
                  label="Related products"
                  value={relatedSkuQuery}
                  onChange={setRelatedSkuQuery}
                  onPick={(hit) => {
                    const current = relatedSkus
                      .split(",")
                      .map((sku) => sku.trim())
                      .filter(Boolean);
                    if (current.includes(hit.sku)) return;
                    setValue("relatedSkus", [...current, hit.sku].join(", "), { shouldDirty: true });
                    setRelatedSkuQuery("");
                  }}
                  excludeSkus={relatedSkus
                    .split(",")
                    .map((sku) => sku.trim())
                    .filter(Boolean)}
                />
                <input type="hidden" {...register("relatedSkus")} />
                {relatedSkus.trim() ? (
                  <ul className="flex flex-wrap gap-2">
                    {relatedSkus
                      .split(",")
                      .map((sku) => sku.trim())
                      .filter(Boolean)
                      .map((sku) => (
                        <li
                          key={sku}
                          className="flex items-center gap-1 rounded-full border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                        >
                          <span className="font-mono">{sku}</span>
                          <button
                            type="button"
                            className="text-neutral-500 hover:text-danger-600"
                            onClick={() => {
                              const next = relatedSkus
                                .split(",")
                                .map((item) => item.trim())
                                .filter((item) => item && item !== sku);
                              setValue("relatedSkus", next.join(", "), { shouldDirty: true });
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500">Search and select products. SKUs are stored on the post.</p>
                )}
              </div>

              <CategoryPicker
                selectedIds={categoryIds}
                onChange={(ids) => setValue("categoryIds", ids, { shouldDirty: true })}
              />
              <TagPicker selectedIds={tagIds} onChange={(ids) => setValue("tagIds", ids, { shouldDirty: true })} />
            </CardContent>
          </Card>

          <SeoPanel value={seo} onChange={(next) => setValue("seo", next, { shouldDirty: true })} />

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
                  <label className="text-sm font-medium" htmlFor="post-schedule-at">
                    Schedule for
                  </label>
                  <input
                    id="post-schedule-at"
                    type="datetime-local"
                    {...scheduleForm.register("scheduledAt")}
                    className={INPUT_CLASS}
                  />
                  <FieldError message={scheduleForm.formState.errors.scheduledAt?.message} />
                  <Button type="submit" variant="outline" size="sm" disabled={scheduleMutation.isPending}>
                    {scheduleMutation.isPending ? "Scheduling…" : "Schedule"}
                  </Button>
                </form>

                {actionError && <p className="text-sm text-danger-600">{actionError}</p>}

                <dl className="flex flex-col gap-1 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800">
                  <div className="flex justify-between">
                    <dt>Scheduled</dt>
                    <dd>{formatDateTime(post?.scheduledAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Published</dt>
                    <dd>{formatDateTime(post?.publishedAt)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
