"use client";

import type { CollectionSummary } from "@ecom/types";
import { Button, ConfirmDialog, Dialog } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api";
import { INPUT_CLASS } from "@/lib/form-styles";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface CollectionFormState {
  name: string;
  description: string;
}

const EMPTY_FORM: CollectionFormState = { name: "", description: "" };

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionSummary | null>(null);
  const [form, setForm] = useState<CollectionFormState>(EMPTY_FORM);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const { data: collections, isLoading, isError } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => apiFetch<CollectionSummary[]>("/admin/collections"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name: form.name, description: form.description || undefined };
      if (editing) {
        return apiFetch<CollectionSummary>(`/admin/collections/${editing.slug}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      return apiFetch<CollectionSummary>("/admin/collections", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      setError(null);
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (collection: CollectionSummary) =>
      apiFetch<CollectionSummary>(`/admin/collections/${collection.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !collection.isActive }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-collections"] }),
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/admin/collections/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteSlug(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(collection: CollectionSummary) {
    setEditing(collection);
    setForm({ name: collection.name, description: collection.description ?? "" });
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Collections"
        description="Group products for merchandising. Edit, deactivate, or delete collections from this list."
        actions={
          <Button type="button" onClick={openCreate}>
            Add collection
          </Button>
        }
      />

      {error ? <p className="text-sm text-danger-600">{error}</p> : null}
      {isLoading ? <AdminTableSkeleton /> : null}
      {isError ? <p className="text-danger-600">Failed to load collections. Log in as admin first.</p> : null}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-950">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections?.map((col) => (
              <tr key={col.slug} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3 font-medium">{col.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{col.slug}</td>
                <td className="max-w-xs truncate px-4 py-3 text-neutral-600">{col.description ?? "—"}</td>
                <td className="px-4 py-3">{col.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(col)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMutation.mutate(col)}
                      disabled={toggleMutation.isPending}
                    >
                      {col.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteSlug(col.slug)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {collections?.length === 0 ? <p className="p-4 text-neutral-500">No collections yet.</p> : null}
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit collection" : "Add collection"}
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
        title="Delete collection"
        description="Products will be unassigned from this collection. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
