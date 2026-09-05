"use client";

import type { MenuItemSummary, UpsertMenuItemInput } from "@ecom/types";
import { ConfirmDialog } from "@ecom/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

import { MenuItemForm } from "./menu-item-form";

function MenuItemRow({
  item,
  depth,
  menuId,
}: {
  item: MenuItemSummary;
  depth: number;
  menuId: string;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit" | "add-child">("view");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (payload: UpsertMenuItemInput) =>
      apiFetch(`/admin/cms/menu-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setError(null);
      setMode("view");
      void queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const addChildMutation = useMutation({
    mutationFn: (payload: UpsertMenuItemInput) =>
      apiFetch(`/admin/cms/menus/${menuId}/items`, {
        method: "POST",
        body: JSON.stringify({ ...payload, parentId: item.id }),
      }),
    onSuccess: () => {
      setError(null);
      setMode("view");
      void queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/cms/menu-items/${item.id}`, { method: "DELETE" }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <li>
      <div
        className="flex items-center justify-between gap-3 rounded-md py-1.5"
        style={{ paddingLeft: depth * 20 }}
      >
        <div className="flex flex-1 items-center gap-2 text-sm">
          <span className="font-medium">{item.label}</span>
          <span className="text-neutral-500">{item.url}</span>
          {!item.isActive && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
              Inactive
            </span>
          )}
          {item.opensInNewTab && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              New tab
            </span>
          )}
          <span className="text-xs text-neutral-400">#{item.sortOrder}</span>
        </div>
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            className="text-brand-600 hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "add-child" ? "view" : "add-child")}
            className="text-brand-600 hover:underline"
          >
            Add child
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMutation.isPending}
            className="text-danger-600 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger-600" style={{ paddingLeft: depth * 20 }}>
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete menu item"
        description={`Delete menu item "${item.label}"? This will not delete its children.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate();
          setConfirmDelete(false);
        }}
      />

      {mode === "edit" && (
        <div style={{ paddingLeft: depth * 20 }} className="pb-2">
          <MenuItemForm
            initial={item}
            submitLabel="Save changes"
            isPending={updateMutation.isPending}
            error={null}
            onCancel={() => setMode("view")}
            onSubmit={(payload) => updateMutation.mutate(payload)}
          />
        </div>
      )}

      {mode === "add-child" && (
        <div style={{ paddingLeft: (depth + 1) * 20 }} className="pb-2">
          <MenuItemForm
            submitLabel="Add child item"
            isPending={addChildMutation.isPending}
            error={null}
            onCancel={() => setMode("view")}
            onSubmit={(payload) => addChildMutation.mutate(payload)}
          />
        </div>
      )}

      {item.children.length > 0 && (
        <ul className="flex flex-col">
          {item.children.map((child) => (
            <MenuItemRow key={child.id} item={child} depth={depth + 1} menuId={menuId} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function MenuItemTree({ menuId, items }: { menuId: string; items: MenuItemSummary[] }) {
  const queryClient = useQueryClient();
  const [showAddTopLevel, setShowAddTopLevel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTopLevelMutation = useMutation({
    mutationFn: (payload: UpsertMenuItemInput) =>
      apiFetch(`/admin/cms/menus/${menuId}/items`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setError(null);
      setShowAddTopLevel(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !showAddTopLevel && (
        <p className="text-sm text-neutral-500">No menu items yet.</p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => (
            <MenuItemRow key={item.id} item={item} depth={0} menuId={menuId} />
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-danger-600">{error}</p>}

      {showAddTopLevel ? (
        <MenuItemForm
          submitLabel="Add item"
          isPending={addTopLevelMutation.isPending}
          error={null}
          onCancel={() => setShowAddTopLevel(false)}
          onSubmit={(payload) => addTopLevelMutation.mutate(payload)}
        />
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setShowAddTopLevel(true)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Add top-level item
          </button>
        </div>
      )}
    </div>
  );
}
