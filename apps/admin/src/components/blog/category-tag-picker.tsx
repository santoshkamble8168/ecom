"use client";

import type { BlogCategorySummary, BlogTagSummary } from "@ecom/types";
import { blogNameFormSchema, type BlogNameFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

export function CategoryPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BlogNameFormValues>({
    resolver: zodResolver(blogNameFormSchema),
    defaultValues: { name: "" },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: () => apiFetch<BlogCategorySummary[]>(`/admin/blog/categories`),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<BlogCategorySummary>(`/admin/blog/categories`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (created) => {
      setError(null);
      reset({ name: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      onChange([...selectedIds, created.id]);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Categories</label>
      <div className="flex flex-wrap gap-2">
        {categories?.map((category) => (
          <label
            key={category.id}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(category.id)}
              onChange={() => onChange(toggle(selectedIds, category.id))}
            />
            {category.name}
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input type="text" placeholder="New category name" {...register("name")} className={INPUT_CLASS} />
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleSubmit((values) => createMutation.mutate(values.name.trim()))}
            className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Add
          </button>
        </div>
        <FieldError message={errors.name?.message} />
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}

export function TagPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BlogNameFormValues>({
    resolver: zodResolver(blogNameFormSchema),
    defaultValues: { name: "" },
  });

  const { data: tags } = useQuery({
    queryKey: ["admin-blog-tags"],
    queryFn: () => apiFetch<BlogTagSummary[]>(`/admin/blog/tags`),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<BlogTagSummary>(`/admin/blog/tags`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (created) => {
      setError(null);
      reset({ name: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-blog-tags"] });
      onChange([...selectedIds, created.id]);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Tags</label>
      <div className="flex flex-wrap gap-2">
        {tags?.map((tag) => (
          <label
            key={tag.id}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(tag.id)}
              onChange={() => onChange(toggle(selectedIds, tag.id))}
            />
            {tag.name}
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input type="text" placeholder="New tag name" {...register("name")} className={INPUT_CLASS} />
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleSubmit((values) => createMutation.mutate(values.name.trim()))}
            className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Add
          </button>
        </div>
        <FieldError message={errors.name?.message} />
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
