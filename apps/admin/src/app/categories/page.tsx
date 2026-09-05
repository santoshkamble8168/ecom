"use client";

import type { CategorySummary } from "@ecom/types";
import { Button, ConfirmDialog, Dialog } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api";
import { INPUT_CLASS } from "@/lib/form-styles";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface CategoryFormState {
  name: string;
  description: string;
  parentSlug: string;
  sortOrder: string;
}

const EMPTY_FORM: CategoryFormState = { name: "", description: "", parentSlug: "", sortOrder: "0" };

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategorySummary | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<CategorySummary[]>("/admin/categories"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        description: form.description || undefined,
        parentSlug: editing ? undefined : form.parentSlug || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        return apiFetch<CategorySummary>(`/admin/categories/${editing.slug}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      return apiFetch<CategorySummary>("/admin/categories", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      setError(null);
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (category: CategorySummary) =>
      apiFetch<CategorySummary>(`/admin/categories/${category.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.isActive }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/admin/categories/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteSlug(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(category: CategorySummary) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      parentSlug: category.parentSlug ?? "",
      sortOrder: String(category.sortOrder),
    });
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Categories"
        description="Organize the catalog tree. Edit names and sort order, deactivate categories, or delete unused leaves."
        actions={
          <Button type="button" onClick={openCreate}>
            Add category
          </Button>
        }
      />

      {error ? <p className="text-sm text-danger-600">{error}</p> : null}
      {isLoading ? <AdminTableSkeleton /> : null}
      {isError ? <p className="text-danger-600">Failed to load categories. Log in as admin first.</p> : null}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-950">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Sort</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories?.map((cat) => (
              <tr key={cat.slug} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3">{cat.parentSlug ?? "—"}</td>
                <td className="px-4 py-3">{cat.sortOrder}</td>
                <td className="px-4 py-3">{cat.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(cat)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMutation.mutate(cat)}
                      disabled={toggleMutation.isPending}
                    >
                      {cat.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteSlug(cat.slug)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories?.length === 0 ? <p className="p-4 text-neutral-500">No categories yet.</p> : null}
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit category" : "Add category"}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className={INPUT_CLASS}
            />
          </label>
          {!editing ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Parent</span>
              <select
                value={form.parentSlug}
                onChange={(event) => setForm((current) => ({ ...current, parentSlug: event.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="">None (top level)</option>
                {categories?.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Sort order</span>
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteSlug)}
        onClose={() => setDeleteSlug(null)}
        onConfirm={() => {
          if (deleteSlug) deleteMutation.mutate(deleteSlug);
        }}
        title="Delete category"
        description="Categories with children cannot be deleted. Products in this category will lose the assignment."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
