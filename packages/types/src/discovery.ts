import type { PaginationMeta } from "./api";
import type { ProductSummary } from "./catalog";

export type ProductSortKey = "newest" | "price_asc" | "price_desc" | "popular" | "discount";

export interface FacetValue {
  slug: string;
  label: string;
  count: number;
}

export interface ProductFacets {
  sizes: FacetValue[];
  colors: FacetValue[];
  brands: FacetValue[];
  priceRange: { min: number; max: number };
}

export interface DiscoveryQuery {
  page?: number;
  pageSize?: number;
  sort?: ProductSortKey;
  q?: string;
  categorySlug?: string;
  collectionSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  brands?: string[];
  onSale?: boolean;
  /** Sprint 16: `semantic` is recorded when the flag is on; retrieval stays keyword. */
  mode?: "keyword" | "semantic";
}

export interface ProductListResult {
  items: ProductSummary[];
  facets: ProductFacets;
  meta: {
    pagination: PaginationMeta;
    sort: ProductSortKey;
    searchEngine?: "meilisearch" | "postgres";
    /** Always `keyword` until a vector provider is wired (Sprint 16). */
    searchMode?: "keyword" | "semantic";
    /** True when the client asked for semantic mode and the flag is on. */
    semanticRequested?: boolean;
  };
}

export interface SearchAnalyticsEvent {
  query: string;
  resultCount: number;
  filters?: Record<string, unknown>;
}
