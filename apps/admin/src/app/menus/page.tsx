"use client";

import type { MenuSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { createMenuFormSchema, type CreateMenuFormValues } from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { MenuItemTree } from "@/components/cms/menu-item-tree";
import { FieldError } from "@/components/form/field-error";
import { AdminPageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function CreateMenuForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMenuFormValues>({
    resolver: zodResolver(createMenuFormSchema),
    defaultValues: { code: "", name: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateMenuFormValues) =>
      apiFetch<MenuSummary>(`/admin/cms/menus`, {
        method: "POST",
        body: JSON.stringify({ code: values.code.trim(), name: values.name.trim() }),
      }),
    onSuccess: () => {
      setError(null);
      reset({ code: "", name: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New menu</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="menu-code">
              Code
            </label>
            <input
              id="menu-code"
              type="text"
              placeholder="e.g. main-nav"
              {...register("code")}
              className={INPUT_CLASS}
            />
            <FieldError message={errors.code?.message} />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="menu-name">
              Name
            </label>
            <input
              id="menu-name"
              type="text"
              placeholder="e.g. Main Navigation"
              {...register("name")}
              className={INPUT_CLASS}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create menu"}
            </Button>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

export default function MenusPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: menus, isLoading, isError, error } = useQuery({
    queryKey: ["admin-menus"],
    queryFn: () => apiFetch<MenuSummary[]>(`/admin/cms/menus`),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Menus"
        description="Edit navigation trees for the storefront. Add, nest, or remove items on each menu."
        actions={
          <Button type="button" onClick={() => setShowCreate((v) => !v)}>
            New Menu
          </Button>
        }
      />

      {showCreate && <CreateMenuForm onDone={() => setShowCreate(false)} />}

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load menus."}
        </p>
      )}

      {!isLoading && !isError && menus?.length === 0 && (
        <p className="text-neutral-500">No menus yet. Create one above.</p>
      )}

      <div className="flex flex-col gap-6">
        {menus?.map((menu) => (
          <Card key={menu.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {menu.name}
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-mono font-normal text-neutral-500 dark:bg-neutral-800">
                  {menu.code}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MenuItemTree menuId={menu.id} items={menu.items} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
