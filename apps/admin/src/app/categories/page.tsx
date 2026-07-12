"use client";

import type { CategorySummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<CategorySummary[]>("/admin/categories"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<CategorySummary>("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          parentSlug: parentSlug || undefined,
        }),
      }),
    onSuccess: () => {
      setName("");
      setParentSlug("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Categories</h1>
        <Link href="/login" className="text-sm text-neutral-500 hover:underline">
          Login
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <input
              type="text"
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              required
            />
            <input
              type="text"
              placeholder="Parent slug (optional)"
              value={parentSlug}
              onChange={(e) => setParentSlug(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading categories…</p>}
      {isError && <p className="text-red-600">Failed to load categories. Log in as admin first.</p>}

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Parent</th>
              <th className="px-4 py-3 text-left font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {categories?.map((cat) => (
              <tr key={cat.slug} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3">{cat.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3">{cat.parentSlug ?? "—"}</td>
                <td className="px-4 py-3">{cat.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
