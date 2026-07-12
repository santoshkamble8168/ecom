import type { CollectionSummary, ProductSummary } from "./catalog";

export interface AnnouncementSummary {
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
}

export interface NavigationNode {
  label: string;
  href: string;
  children?: NavigationNode[];
}

export interface NavigationSummary {
  announcement: AnnouncementSummary | null;
  header: NavigationNode[];
  footer: {
    shop: NavigationNode[];
    support: NavigationNode[];
    legal: NavigationNode[];
  };
}

export interface HomepageHeroBlock {
  type: "hero";
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  badge?: string;
}

export interface HomepageGenderTile {
  label: string;
  href: string;
  imageUrl: string;
}

export interface HomepageShopByGenderBlock {
  type: "shop-by-gender";
  title: string;
  items: HomepageGenderTile[];
}

export interface HomepageSocialProofBlock {
  type: "social-proof";
  items: Array<{ label: string; value: string }>;
}

export interface HomepageTrustBadgesBlock {
  type: "trust-badges";
  items: Array<{ label: string; description: string }>;
}

export interface HomepageCollectionRailBlock {
  type: "collection-rail";
  title: string;
  collections: CollectionSummary[];
}

export interface HomepageProductRailBlock {
  type: "product-rail";
  title: string;
  products: ProductSummary[];
}

export interface HomepageNewsletterBlock {
  type: "newsletter";
  title: string;
  description: string;
  placeholder: string;
  ctaLabel: string;
}

export type HomepageBlock =
  | HomepageHeroBlock
  | HomepageShopByGenderBlock
  | HomepageSocialProofBlock
  | HomepageTrustBadgesBlock
  | HomepageCollectionRailBlock
  | HomepageProductRailBlock
  | HomepageNewsletterBlock;

export interface HomepageSummary {
  blocks: HomepageBlock[];
}

export interface SearchSuggestion {
  type: "product" | "category" | "collection";
  label: string;
  href: string;
}

export interface SearchSuggestionsResponse {
  query: string;
  suggestions: SearchSuggestion[];
}

export interface TrendingSearchesResponse {
  terms: string[];
}

export interface NewsletterSubscribeResult {
  email: string;
  subscribed: boolean;
}
