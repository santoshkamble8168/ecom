export type ProductStatus = "draft" | "review" | "published" | "archived";

export interface ProductSummary {
  slug: string;
  title: string;
  brand: string | null;
  status: ProductStatus;
  basePrice: string | null;
  compareAtPrice: string | null;
  primaryImage: ProductMediaSummary | null;
  categorySlugs: string[];
  publishedAt: string | null;
  /** Sprint 10 pricing enrichment — the currently effective price (accounts
   * for scheduled sales), when resolvable. Falls back to `basePrice` when absent. */
  effectivePrice?: string;
  /** True when a scheduled sale is currently active for this product's default variant. */
  saleActive?: boolean;
  /** Short label (e.g. "15% OFF", "Flash Sale") when an active campaign covers this product. */
  campaignBadge?: string | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  variants: ProductVariantSummary[];
  media: ProductMediaSummary[];
  collections: CollectionSummary[];
  tags: TagSummary[];
  seo: ProductSeoSummary | null;
}

export interface ProductVariantSummary {
  sku: string;
  price: string;
  compareAtPrice: string | null;
  isActive: boolean;
  options: VariantOptionSummary[];
  /** Sprint 10 pricing enrichment — the currently effective price for this
   * variant (accounts for scheduled sales), when resolvable. Falls back to `price` when absent. */
  effectivePrice?: string;
  /** True when a scheduled sale is currently active for this variant. */
  saleActive?: boolean;
}

export interface VariantOptionSummary {
  attributeKey: string;
  attributeName: string;
  value: string;
  valueSlug: string;
}

export interface ProductMediaSummary {
  url: string;
  altText: string | null;
  type: "image" | "video";
  sortOrder: number;
}

export interface ProductSeoSummary {
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
}

export interface CategorySummary {
  slug: string;
  name: string;
  description: string | null;
  parentSlug: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: CategorySummary[];
}

export interface CollectionSummary {
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface TagSummary {
  slug: string;
  name: string;
}

export interface AttributeDefinitionSummary {
  key: string;
  name: string;
  type: "select" | "text" | "number";
  values: AttributeValueSummary[];
}

export interface AttributeValueSummary {
  slug: string;
  value: string;
  sortOrder: number;
}

export interface PublishProductResult {
  slug: string;
  status: ProductStatus;
  publishedAt: string;
}
