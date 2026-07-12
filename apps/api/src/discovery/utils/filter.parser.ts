import type { ProductSortKey } from "@ecom/types";

export function parseSortKey(value?: string): ProductSortKey {
  const allowed: ProductSortKey[] = ["newest", "price_asc", "price_desc", "popular", "discount"];
  if (value && allowed.includes(value as ProductSortKey)) {
    return value as ProductSortKey;
  }
  return "newest";
}

export function parseCsvFilter(value?: string): string[] {
  if (!value?.trim()) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

export function parsePrice(value?: string): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
