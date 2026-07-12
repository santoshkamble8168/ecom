"use client";

import type { ProductFacets, ProductListResult, ProductSortKey } from "@ecom/types";
import { ProductCard } from "@ecom/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SORT_OPTIONS } from "@/lib/discovery";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface PlpViewProps {
  title: string;
  description?: string;
  apiPath: string;
  searchMode?: boolean;
}

function getArrayParam(sp: URLSearchParams, key: string): string[] {
  const val = sp.get(key);
  return val ? val.split(",").filter(Boolean) : [];
}

export function PlpView({ title, description, apiPath, searchMode }: PlpViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProductListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const initialLoad = useRef(true);

  // Stable string key — avoids infinite loops from array identity changes in useEffect deps.
  const queryKey = searchParams.toString();

  const q = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") ?? "newest") as ProductSortKey;
  const page = Number(searchParams.get("page") ?? "1");
  const sizes = useMemo(() => getArrayParam(searchParams, "sizes"), [searchParams]);
  const colors = useMemo(() => getArrayParam(searchParams, "colors"), [searchParams]);
  const brands = useMemo(() => getArrayParam(searchParams, "brands"), [searchParams]);
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const onSale = searchParams.get("onSale") === "true";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") sp.delete(key);
        else sp.set(key, val);
      }
      if (!("page" in updates)) sp.delete("page");
      const next = sp.toString();
      if (next === searchParams.toString()) return;
      router.replace(`?${next}`, { scroll: false });
    },
    [router, searchParams],
  );

  const toggleFilter = useCallback(
    (key: "sizes" | "colors" | "brands", slug: string) => {
      const current = getArrayParam(searchParams, key);
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug];
      updateParams({ [key]: next.length ? next.join(",") : null });
    },
    [searchParams, updateParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    const isFirst = initialLoad.current;
    if (isFirst) {
      setLoading(true);
    }
    setError(null);

    const sp = new URLSearchParams(queryKey);
    if (!sp.has("page")) sp.set("page", "1");
    if (!sp.has("sort")) sp.set("sort", "newest");

    const endpoint = searchMode
      ? `${API_URL}/search?${sp}`
      : `${API_URL}${apiPath}?${sp}`;

    fetch(endpoint, { signal: controller.signal })
      .then((r) => r.json())
      .then((body) => {
        if (!body.success) throw new Error(body.error?.message);
        setData(body.data);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        initialLoad.current = false;
        setLoading(false);
      });

    return () => controller.abort();
  }, [apiPath, searchMode, queryKey]);

  const facets: ProductFacets | undefined = data?.facets;
  const total = data?.meta.pagination.totalItems ?? 0;
  const showSkeleton = loading && !data;

  const filterPanel = facets && (
    <div className="space-y-6">
      <FilterGroup
        title="Size"
        items={facets.sizes}
        selected={sizes}
        onToggle={(slug) => toggleFilter("sizes", slug)}
      />
      <FilterGroup
        title="Color"
        items={facets.colors}
        selected={colors}
        onToggle={(slug) => toggleFilter("colors", slug)}
      />
      <FilterGroup
        title="Brand"
        items={facets.brands}
        selected={brands}
        onToggle={(slug) => toggleFilter("brands", slug)}
      />
      <div>
        <h3 className="mb-2 text-sm font-semibold">Price</h3>
        <div className="flex gap-2">
          <input
            key={`min-${minPrice}`}
            type="number"
            placeholder="Min"
            defaultValue={minPrice}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            onBlur={(e) => updateParams({ minPrice: e.target.value || null })}
          />
          <input
            key={`max-${maxPrice}`}
            type="number"
            placeholder="Max"
            defaultValue={maxPrice}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            onBlur={(e) => updateParams({ maxPrice: e.target.value || null })}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onSale}
          onChange={(e) => updateParams({ onSale: e.target.checked ? "true" : null })}
        />
        On sale only
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">{searchMode && q ? `Results for "${q}"` : title}</h1>
        {description && <p className="mt-1 text-neutral-500">{description}</p>}
        <p className="mt-2 text-sm text-neutral-500">{total} products</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm md:hidden dark:border-neutral-700"
          onClick={() => setMobileFiltersOpen(true)}
        >
          Filters
        </button>
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 md:block">{filterPanel}</aside>

        <div className="flex-1">
          {showSkeleton && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              Failed to load products. {error}
            </p>
          )}

          {!showSkeleton && !error && data?.items.length === 0 && (
            <div className="rounded-lg border border-neutral-200 p-8 text-center dark:border-neutral-800">
              <p className="text-lg font-semibold">No products found</p>
              <p className="mt-2 text-sm text-neutral-500">
                Try adjusting your filters or browse our collections.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link href="/collections/new-arrivals" className="text-brand-700 hover:underline">
                  New Arrivals
                </Link>
                <Link href="/collections/best-sellers" className="text-brand-700 hover:underline">
                  Best Sellers
                </Link>
              </div>
            </div>
          )}

          {!showSkeleton && data && data.items.length > 0 && (
            <>
              <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
                {data.items.map((product) => (
                  <Link key={product.slug} href={`/products/${product.slug}`}>
                    <ProductCard product={product} />
                  </Link>
                ))}
              </div>

              {data.meta.pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                    onClick={() => updateParams({ page: String(page - 1) })}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {page} of {data.meta.pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= data.meta.pagination.totalPages}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                    onClick={() => updateParams({ page: String(page + 1) })}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-neutral-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)}>
                Done
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Array<{ slug: string; label: string; count: number }>;
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.slug}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(item.slug)}
                onChange={() => onToggle(item.slug)}
              />
              <span>{item.label}</span>
              <span className="text-neutral-400">({item.count})</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
