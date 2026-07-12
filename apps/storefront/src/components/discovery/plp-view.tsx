"use client";

import type { ProductFacets, ProductListResult, ProductSortKey } from "@ecom/types";
import { ProductCard } from "@ecom/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getToken } from "@/lib/auth";
import { SORT_OPTIONS } from "@/lib/discovery";
import { getSessionId } from "@/lib/session";

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
  const [wishlistIds, setWishlistIds] = useState<Map<string, string>>(new Map());
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

  const activeFilterCount = sizes.length + colors.length + brands.length + (onSale ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

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

  const clearAllFilters = useCallback(() => {
    updateParams({ sizes: null, colors: null, brands: null, minPrice: null, maxPrice: null, onSale: null });
  }, [updateParams]);

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

  useEffect(() => {
    fetch(`${API_URL}/wishlist?sessionId=${encodeURIComponent(getSessionId())}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setWishlistIds(
            new Map(body.data.map((item: { id: string; productSlug: string }) => [item.productSlug, item.id])),
          );
        }
      })
      .catch(() => undefined);
  }, []);

  async function toggleWishlist(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const existingId = wishlistIds.get(slug);
    const token = getToken();
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      if (existingId) {
        setWishlistIds((prev) => {
          const next = new Map(prev);
          next.delete(slug);
          return next;
        });
        await fetch(
          `${API_URL}/wishlist/items/${existingId}?sessionId=${encodeURIComponent(getSessionId())}`,
          { method: "DELETE", headers: authHeader },
        );
      } else {
        const res = await fetch(`${API_URL}/wishlist/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ productSlug: slug, sessionId: getSessionId() }),
        });
        const body = await res.json();
        if (body.success && body.data?.id) {
          setWishlistIds((prev) => new Map(prev).set(slug, body.data.id));
        }
      }
    } catch {
      // Optimistic update already applied for removal; ignore transient failures.
    }
  }

  const facets: ProductFacets | undefined = data?.facets;
  const total = data?.meta.pagination.totalItems ?? 0;
  const showSkeleton = loading && !data;

  const filterPanel = facets && (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      <FilterGroup
        title="Size"
        items={facets.sizes}
        selected={sizes}
        onToggle={(slug) => toggleFilter("sizes", slug)}
      />
      {/* Color filter hidden until swatches/color imagery are seeded — facets.colors is
          intentionally unused here. */}
      <FilterGroup
        title="Brand"
        items={facets.brands}
        selected={brands}
        onToggle={(slug) => toggleFilter("brands", slug)}
      />
      <details className="group py-4" open>
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
          Price
          <ChevronIcon />
        </summary>
        <div className="mt-3 flex gap-2">
          <input
            key={`min-${minPrice}`}
            type="number"
            placeholder="Min"
            defaultValue={minPrice}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            onBlur={(e) => updateParams({ minPrice: e.target.value || null })}
          />
          <input
            key={`max-${maxPrice}`}
            type="number"
            placeholder="Max"
            defaultValue={maxPrice}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            onBlur={(e) => updateParams({ maxPrice: e.target.value || null })}
          />
        </div>
      </details>
      <div className="py-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => updateParams({ onSale: e.target.checked ? "true" : null })}
            className="h-4 w-4 accent-neutral-900"
          />
          On sale only
        </label>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-3 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span className="text-neutral-900 dark:text-neutral-200">
          {searchMode && q ? `Search results` : title}
        </span>
      </nav>

      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {searchMode && q ? `Results for "${q}"` : title}
          </h1>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        </div>
        <p className="text-sm text-neutral-500">{total} items</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm md:hidden dark:border-neutral-700"
          onClick={() => setMobileFiltersOpen(true)}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[11px] text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="plp-sort" className="hidden text-sm text-neutral-500 sm:inline">
            Sort by
          </label>
          <select
            id="plp-sort"
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
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="mb-1 flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </h2>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-accent-600 hover:text-accent-700"
              >
                Clear All
              </button>
            )}
          </div>
          {filterPanel}
        </aside>

        <div className="flex-1">
          {showSkeleton && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
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
              <div className={`grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
                {data.items.map((product) => (
                  <Link key={product.slug} href={`/products/${product.slug}`}>
                    <ProductCard
                      product={product}
                      showStatus={false}
                      wishlisted={wishlistIds.has(product.slug)}
                      onToggleWishlist={(e) => void toggleWishlist(product.slug, e)}
                    />
                  </Link>
                ))}
              </div>

              {data.meta.pagination.totalPages > 1 && (
                <div className="mt-10 flex justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
                    onClick={() => updateParams({ page: String(page - 1) })}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-neutral-500">
                    Page {page} of {data.meta.pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= data.meta.pagination.totalPages}
                    className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
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
              <h2 className="font-semibold">Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}</h2>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-accent-600">
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
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
    <details className="group py-4" open>
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        {title}
        <ChevronIcon />
      </summary>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.slug}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(item.slug)}
                onChange={() => onToggle(item.slug)}
                className="h-4 w-4 accent-neutral-900"
              />
              <span>{item.label}</span>
              <span className="text-neutral-400">({item.count})</span>
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
