import type { DiscoveryQuery, ProductListResult, ProductSortKey } from "@ecom/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function buildDiscoveryQueryString(params: DiscoveryQuery): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sort) sp.set("sort", params.sort);
  if (params.q) sp.set("q", params.q);
  if (params.minPrice != null) sp.set("minPrice", String(params.minPrice));
  if (params.maxPrice != null) sp.set("maxPrice", String(params.maxPrice));
  if (params.sizes?.length) sp.set("sizes", params.sizes.join(","));
  if (params.colors?.length) sp.set("colors", params.colors.join(","));
  if (params.brands?.length) sp.set("brands", params.brands.join(","));
  if (params.onSale) sp.set("onSale", "true");
  return sp.toString();
}

export async function fetchProductList(
  endpoint: string,
  params: DiscoveryQuery,
): Promise<ProductListResult> {
  const qs = buildDiscoveryQueryString(params);
  const url = `${API_URL}${endpoint}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message ?? "Failed to load products");
  return body.data as ProductListResult;
}

export const SORT_OPTIONS: Array<{ value: ProductSortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "discount", label: "Discount" },
];
