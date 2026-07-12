"use client";

import type { ProductSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle, ProductCard, StatusBadge } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api";

interface ProductListResponse {
  items: ProductSummary[];
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const result = await apiFetchWithMeta<ProductListResponse>("/admin/products?pageSize=50");
      return result.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ProductSummary>("/admin/products", {
        method: "POST",
        body: JSON.stringify({ title, basePrice: basePrice || undefined }),
      }),
    onSuccess: () => {
      setTitle("");
      setBasePrice("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (slug: string) =>
      apiFetch(`/admin/products/${slug}/publish`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Products</h1>
        <Link href="/login" className="text-sm text-neutral-500 hover:underline">
          Login
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Draft Product</CardTitle>
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
              placeholder="Product title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              required
            />
            <input
              type="text"
              placeholder="Base price (e.g. 499.00)"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Draft"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading products…</p>}
      {isError && (
        <p className="text-red-600">
          Failed to load products. Make sure you are logged in as an admin.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.items.map((product) => (
          <div key={product.slug} className="relative">
            <ProductCard product={product} />
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={product.status} />
              {product.status === "draft" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => publishMutation.mutate(product.slug)}
                  disabled={publishMutation.isPending}
                >
                  Publish
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {data?.items.length === 0 && !isLoading && (
        <p className="text-neutral-500">No products yet. Create your first draft above.</p>
      )}
    </div>
  );
}
