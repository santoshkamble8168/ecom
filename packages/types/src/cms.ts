/**
 * CMS domain (Sprint 11) — fixed content-type templates, not a freeform
 * drag-and-drop block builder. Each `PageType` has a fixed `fields` shape
 * (below); a page's `sections` array (where present) is drawn from a small,
 * fixed vocabulary of section "kinds" with their own fixed fields — content
 * teams fill in data via forms, they don't compose arbitrary new layouts.
 */

export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type PageType = "landing" | "policy" | "faq" | "homepage" | "campaign";

export type PageSection =
  | { kind: "hero_banner"; bannerId: string }
  | { kind: "banner_strip"; bannerIds: string[] }
  | { kind: "collection_grid"; title: string; collectionSlug: string; limit?: number }
  | { kind: "campaign_grid"; title: string; campaignSlug: string }
  | { kind: "rich_text"; title?: string; html: string }
  | {
      kind: "hero";
      headline: string;
      subheadline: string;
      ctaLabel: string;
      ctaHref: string;
      imageUrl: string;
      imageAlt: string;
    }
  | { kind: "feature_grid"; title: string; items: Array<{ title: string; description: string }> }
  | { kind: "fit_guide"; title: string; html: string; imageUrl?: string }
  | { kind: "story"; title: string; html: string }
  | { kind: "cta_banner"; headline: string; subheadline?: string; ctaLabel: string; ctaHref: string }
  | { kind: "trust_row"; title?: string; items: Array<{ title: string; description: string }> };

export interface HomepageFields {
  sections: PageSection[];
}

export interface LandingPageFields {
  heroTitle: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  heroCtaLabel?: string;
  heroCtaUrl?: string;
  sections: PageSection[];
}

export interface PolicyPageFields {
  bodyHtml: string;
}

export interface FaqPageFields {
  items: Array<{ question: string; answer: string; sortOrder?: number }>;
}

export interface CampaignPageFields extends LandingPageFields {
  campaignSlug: string;
}

export type PageFieldsFor<T extends PageType> = T extends "homepage"
  ? HomepageFields
  : T extends "landing"
    ? LandingPageFields
    : T extends "policy"
      ? PolicyPageFields
      : T extends "faq"
        ? FaqPageFields
        : T extends "campaign"
          ? CampaignPageFields
          : never;

export interface PageSeo {
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonicalUrl: string | null;
  seoOgImage: string | null;
}

export interface PageSummary extends PageSeo {
  id: string;
  type: PageType;
  slug: string;
  title: string;
  status: ContentStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageDetail extends PageSummary {
  fields: HomepageFields | LandingPageFields | PolicyPageFields | FaqPageFields | CampaignPageFields;
}

export interface PageVersionSummary {
  id: string;
  pageId: string;
  title: string;
  publishedBy: string | null;
  createdAt: string;
}

export interface UpsertPageInput extends Partial<PageSeo> {
  type: PageType;
  slug: string;
  title: string;
  fields: Record<string, unknown>;
}

export type BannerPlacement = "homepage_hero" | "homepage_strip" | "category_top" | "cart_strip";

export interface BannerSummary {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  altText: string | null;
  placement: BannerPlacement;
  status: ContentStatus;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertBannerInput {
  title: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  altText?: string | null;
  placement: BannerPlacement;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface MenuItemSummary {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  opensInNewTab: boolean;
  isActive: boolean;
  children: MenuItemSummary[];
}

export interface MenuSummary {
  id: string;
  code: string;
  name: string;
  items: MenuItemSummary[];
}

export interface UpsertMenuItemInput {
  label: string;
  url: string;
  parentId?: string | null;
  sortOrder?: number;
  opensInNewTab?: boolean;
  isActive?: boolean;
}
