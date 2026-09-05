"use client";

import type { CategorySummary, CollectionSummary, ProductDetail } from "@ecom/types";
import { Button, ConfirmDialog, StatusBadge } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { INPUT_CLASS } from "@/lib/form-styles";
import { AdminPageSkeleton } from "@/components/layout/admin-skeleton";

export default function ProductEditorPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [nextSlug, setNextSlug] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [collectionSlugs, setCollectionSlugs] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["admin-product", slug],
    queryFn: () => apiFetch<ProductDetail>(`/admin/products/${slug}`),
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<CategorySummary[]>("/admin/categories"),
  });

  const { data: collections } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => apiFetch<CollectionSummary[]>("/admin/collections"),
  });

  useEffect(() => {
    if (!product) return;
    setTitle(product.title);
    setNextSlug(product.slug);
    setDescription(product.description ?? "");
    setBrand(product.brand ?? "");
    setBasePrice(product.basePrice ?? "");
    setCompareAtPrice(product.compareAtPrice ?? "");
    setCategorySlugs(product.categorySlugs);
    setCollectionSlugs(product.collections.map((item) => item.slug));
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<ProductDetail>(`/admin/products/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          slug: nextSlug,
          description: description || undefined,
          brand: brand || undefined,
          basePrice: basePrice || undefined,
          compareAtPrice: compareAtPrice || undefined,
          categorySlugs,
          collectionSlugs,
        }),
      }),
    onSuccess: (updated) => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-product"] });
      if (updated.slug !== slug) {
        router.replace(`/products/${updated.slug}`);
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/products/${slug}/publish`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-product", slug] });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/products/${slug}/archive`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-product", slug] });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/products/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      router.push("/products");
    },
    onError: (err: Error) => setError(err.message),
  });

  const mediaMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/products/${slug}/media`, {
        method: "POST",
        body: JSON.stringify({ url: mediaUrl, altText: title }),
      }),
    onSuccess: () => {
      setMediaUrl("");
      void queryClient.invalidateQueries({ queryKey: ["admin-product", slug] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  if (isLoading) return <AdminPageSkeleton />;
  if (isError || !product) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-danger-600">Product not found.</p>
        <Link href="/products" className="text-sm text-brand-600 hover:underline">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={product.title}
        description="Update merchandising fields, categories, collections, and media. Variants require option values and are listed below."
        actions={
          <>
            <Link
              href="/products"
              className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium hover:bg-neutral-50"
            >
              Back to list
            </Link>
            {product.status !== "published" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                Publish
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
              >
                Archive
              </Button>
            )}
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <StatusBadge status={product.status} />
        <span className="font-mono text-xs text-neutral-500">{product.slug}</span>
      </div>

      {error ? <p className="text-sm text-danger-600">{error}</p> : null}

      <form
        className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]"
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Title</span>
            <input required value={title} onChange={(event) => setTitle(event.target.value)} className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Slug</span>
            <input required value={nextSlug} onChange={(event) => setNextSlug(event.target.value)} className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Brand</span>
              <input value={brand} onChange={(event) => setBrand(event.target.value)} className={INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Base price</span>
              <input value={basePrice} onChange={(event) => setBasePrice(event.target.value)} className={INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Compare-at price</span>
              <input
                value={compareAtPrice}
                onChange={(event) => setCompareAtPrice(event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-semibold">Categories</h2>
            <ul className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
              {categories?.map((category) => (
                <li key={category.slug}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categorySlugs.includes(category.slug)}
                      onChange={() => toggle(categorySlugs, category.slug, setCategorySlugs)}
                    />
                    {category.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-semibold">Collections</h2>
            <ul className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
              {collections?.map((collection) => (
                <li key={collection.slug}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={collectionSlugs.includes(collection.slug)}
                      onChange={() => toggle(collectionSlugs, collection.slug, setCollectionSlugs)}
                    />
                    {collection.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold">Media</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            mediaMutation.mutate();
          }}
        >
          <input
            type="url"
            required
            placeholder="https://…"
            value={mediaUrl}
            onChange={(event) => setMediaUrl(event.target.value)}
            className={`${INPUT_CLASS} min-w-[16rem] flex-1`}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={mediaMutation.isPending}>
            Add image URL
          </Button>
        </form>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {product.media.map((item) => (
            <li key={`${item.url}-${item.sortOrder}`} className="overflow-hidden rounded-md border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.altText ?? ""} className="h-24 w-full object-cover" />
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 px-5 py-3 text-sm font-semibold dark:border-neutral-800">
          Variants
        </div>
        {product.variants.length === 0 ? (
          <p className="p-5 text-sm text-neutral-500">No variants yet. SKUs are created with option values from the API.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Options</th>
                <th className="px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <tr key={variant.sku} className="border-t border-neutral-200">
                  <td className="px-4 py-2 font-mono text-xs">{variant.sku}</td>
                  <td className="px-4 py-2">{formatCurrency(variant.effectivePrice ?? variant.price)}</td>
                  <td className="px-4 py-2 text-neutral-500">
                    {variant.options.map((option) => `${option.attributeName}: ${option.value}`).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2">{variant.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete product"
        description="This permanently removes the product. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
