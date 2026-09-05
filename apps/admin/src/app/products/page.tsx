"use client";

import type { PaginationMeta, ProductStatus, ProductSummary } from "@ecom/types";
import { Button, ConfirmDialog, Dialog, StatusBadge } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { apiFetch, apiFetchWithMeta } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { INPUT_CLASS } from "@/lib/form-styles";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface ProductListResponse {
  items: ProductSummary[];
  meta?: { pagination?: PaginationMeta };
}

const STATUSES: ProductStatus[] = ["draft", "review", "published", "archived"];

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-products", { search, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const result = await apiFetchWithMeta<ProductListResponse>(`/admin/products?${params.toString()}`);
      return {
        items: result.data.items,
        pagination: result.meta?.pagination ?? result.data.meta?.pagination,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ProductSummary>("/admin/products", {
        method: "POST",
        body: JSON.stringify({ title, basePrice: basePrice || undefined }),
      }),
    onSuccess: (product) => {
      setTitle("");
      setBasePrice("");
      setError(null);
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      router.push(`/products/${product.slug}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/admin/products/${slug}/publish`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (err: Error) => setError(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/admin/products/${slug}/archive`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/admin/products/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteSlug(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Products"
        description="Search, publish, and edit catalog products in a dense list — not a storefront gallery."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Add product
          </Button>
        }
      />

      {error ? <p className="text-sm text-danger-600">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-end dark:border-neutral-800">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            <label className="sr-only" htmlFor="product-search">
              Search products
            </label>
            <input
              id="product-search"
              type="search"
              placeholder="Search title or slug"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-neutral-500">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ProductStatus | "");
                setPage(1);
              }}
              className={INPUT_CLASS}
            >
              <option value="">All statuses</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? <AdminTableSkeleton /> : null}
        {isError ? (
          <p className="p-4 text-danger-600">Failed to load products. Make sure you are logged in as an admin.</p>
        ) : null}

        {!isLoading && !isError ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-950">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Categories</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((product) => (
                  <tr key={product.slug} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.primaryImage?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.primaryImage.url}
                            alt=""
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-400">
                            No img
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/products/${product.slug}`}
                            className="font-medium text-neutral-900 hover:underline dark:text-neutral-50"
                          >
                            {product.title}
                          </Link>
                          <p className="truncate font-mono text-xs text-neutral-500">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3">
                      {product.effectivePrice ?? product.basePrice
                        ? formatCurrency(product.effectivePrice ?? product.basePrice ?? "0")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {product.categorySlugs.length ? product.categorySlugs.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          className="inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
                        >
                          Edit
                        </Link>
                        {product.status !== "published" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => publishMutation.mutate(product.slug)}
                            disabled={publishMutation.isPending}
                          >
                            Publish
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => archiveMutation.mutate(product.slug)}
                            disabled={archiveMutation.isPending}
                          >
                            Archive
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteSlug(product.slug)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {data?.items.length === 0 && !isLoading ? (
          <p className="p-4 text-neutral-500">No products match. Add a product to start the catalog.</p>
        ) : null}

        {totalPages > 1 ? (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-neutral-500">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Add product">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Title</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Base price</span>
            <input
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              placeholder="499.00"
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create draft"}
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
        title="Delete product"
        description="This permanently removes the product and its variants. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
