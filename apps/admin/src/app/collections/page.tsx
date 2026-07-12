"use client";

import type { CollectionSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: collections, isLoading, isError } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => apiFetch<CollectionSummary[]>("/admin/collections"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<CollectionSummary>("/admin/collections", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Collections</h1>
        <Link href="/login" className="text-sm text-neutral-500 hover:underline">
          Login
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <input
              type="text"
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-w-[200px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading collections…</p>}
      {isError && <p className="text-red-600">Failed to load collections. Log in as admin first.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections?.map((col) => (
          <Card key={col.slug}>
            <CardHeader>
              <CardTitle className="text-base">{col.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-mono text-neutral-500">{col.slug}</p>
              {col.description && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {col.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
