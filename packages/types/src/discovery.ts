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
}

export interface ProductListResult {
  items: ProductSummary[];
  facets: ProductFacets;
  meta: {
    pagination: PaginationMeta;
    sort: ProductSortKey;
    searchEngine?: "meilisearch" | "postgres";
  };
}

export interface SearchAnalyticsEvent {
  query: string;
  resultCount: number;
  filters?: Record<string, unknown>;
}
