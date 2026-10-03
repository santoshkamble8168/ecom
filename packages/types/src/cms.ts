/**
 * CMS domain. Legacy page types keep their fixed `fields` shapes.
 * New authoring uses a block document (`editor: "blocks"`) inside `fields`.
 * Dynamic templates are defined in code; pages store the content for those slots.
 */

export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type PageType =
  | "landing"
  | "policy"
  | "faq"
  | "homepage"
  | "campaign"
  | "static"
  | "collection"
  | "category"
  | "blog";

export type PageKind = "static" | "dynamic";

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
  seoNoIndex?: boolean;
}

export interface PageSummary extends PageSeo {
  id: string;
  type: PageType;
  slug: string;
  title: string;
  status: ContentStatus;
  templateKey?: string | null;
  featuredImageUrl?: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageDetail extends PageSummary {
  fields: PageFields;
  reusableSections?: Record<string, ReusableSectionSummary>;
}

export interface PageVersionSummary {
  id: string;
  pageId: string;
  title: string;
  publishedBy: string | null;
  createdAt: string;
}

export interface PageVersionDetail extends PageVersionSummary {
  fields: PageFields;
  seo: PageSeo;
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

export type BlockAlign = "left" | "center" | "right";
export type BlockSpacing = "none" | "sm" | "md" | "lg";
export type BlockVisibility = "all" | "desktop" | "mobile";

export interface BlockStyle {
  align?: BlockAlign;
  spacing?: BlockSpacing;
  backgroundColor?: string;
  textColor?: string;
  visibility?: BlockVisibility;
}

export interface GalleryItem {
  mediaId?: string;
  url?: string;
  alt: string;
}

export type ContentBlock =
  | { id: string; type: "heading"; text: string; level?: 1 | 2 | 3 | 4; style?: BlockStyle }
  | { id: string; type: "paragraph"; html: string; style?: BlockStyle }
  | { id: string; type: "image"; mediaId?: string; url?: string; alt: string; caption?: string; style?: BlockStyle }
  | { id: string; type: "video"; url: string; title?: string; style?: BlockStyle }
  | { id: string; type: "button"; label: string; href: string; style?: BlockStyle }
  | {
      id: string;
      type: "banner";
      title?: string;
      subtitle?: string;
      mediaId?: string;
      url?: string;
      alt?: string;
      ctaLabel?: string;
      ctaHref?: string;
      style?: BlockStyle;
    }
  | { id: string; type: "gallery"; items: GalleryItem[]; style?: BlockStyle }
  | { id: string; type: "columns"; columns: Array<{ blocks: ContentBlock[] }>; style?: BlockStyle }
  | { id: string; type: "testimonials"; items: Array<{ quote: string; author: string; role?: string }>; style?: BlockStyle }
  | { id: string; type: "faq"; items: Array<{ question: string; answer: string }>; style?: BlockStyle }
  | {
      id: string;
      type: "custom_section";
      reusableSectionId?: string;
      detached?: boolean;
      title?: string;
      blocks?: ContentBlock[];
      style?: BlockStyle;
    }
  | {
      id: string;
      type: "product_grid";
      title?: string;
      source: "collection" | "category" | "campaign";
      slug: string;
      limit?: number;
      style?: BlockStyle;
    };

export type DynamicSlot = "hero" | "description" | "featured" | "grid" | "promo" | "faq" | "footer";

export interface BlockPageFields {
  editor: "blocks";
  blocks: ContentBlock[];
  description?: string;
  sourceSlug?: string;
  slots?: Partial<Record<DynamicSlot, ContentBlock[]>>;
}

export type PageFields =
  | HomepageFields
  | LandingPageFields
  | PolicyPageFields
  | FaqPageFields
  | CampaignPageFields
  | BlockPageFields;

export interface DynamicTemplateSlot {
  key: DynamicSlot;
  label: string;
  /** Rendered by the storefront from catalog data. Editors cannot rebuild it. */
  locked?: boolean;
}

export interface DynamicTemplateDefinition {
  key: string;
  pageType: Extract<PageType, "collection" | "category" | "campaign" | "landing" | "blog">;
  label: string;
  summary: string;
  slots: DynamicTemplateSlot[];
}

export const DYNAMIC_TEMPLATES: DynamicTemplateDefinition[] = [
  {
    key: "collection",
    pageType: "collection",
    label: "Collection Page",
    summary: "Hero, description, featured content, product grid, promotion, FAQ, and footer.",
    slots: [
      { key: "hero", label: "Hero Banner" },
      { key: "description", label: "Description" },
      { key: "featured", label: "Featured Content" },
      { key: "grid", label: "Product Grid", locked: true },
      { key: "promo", label: "Promotional Section" },
      { key: "faq", label: "FAQ" },
      { key: "footer", label: "Footer Content" },
    ],
  },
  {
    key: "category",
    pageType: "category",
    label: "Category Page",
    summary: "Intro content around the category product grid.",
    slots: [
      { key: "hero", label: "Hero Banner" },
      { key: "description", label: "Description" },
      { key: "featured", label: "Featured Content" },
      { key: "grid", label: "Product Grid", locked: true },
      { key: "promo", label: "Promotional Section" },
      { key: "faq", label: "FAQ" },
      { key: "footer", label: "Footer Content" },
    ],
  },
  {
    key: "campaign",
    pageType: "campaign",
    label: "Campaign Page",
    summary: "Campaign story content with the campaign product grid.",
    slots: [
      { key: "hero", label: "Hero Banner" },
      { key: "description", label: "Description" },
      { key: "featured", label: "Featured Content" },
      { key: "grid", label: "Product Grid", locked: true },
      { key: "promo", label: "Promotional Section" },
      { key: "faq", label: "FAQ" },
      { key: "footer", label: "Footer Content" },
    ],
  },
  {
    key: "landing",
    pageType: "landing",
    label: "Landing Page",
    summary: "A campaign-style landing page composed from content slots.",
    slots: [
      { key: "hero", label: "Hero Banner" },
      { key: "description", label: "Description" },
      { key: "featured", label: "Featured Content" },
      { key: "promo", label: "Promotional Section" },
      { key: "faq", label: "FAQ" },
      { key: "footer", label: "Footer Content" },
    ],
  },
  {
    key: "blog",
    pageType: "blog",
    label: "Blog Page",
    summary: "Intro and supporting content for a blog index or story page.",
    slots: [
      { key: "hero", label: "Hero Banner" },
      { key: "description", label: "Description" },
      { key: "featured", label: "Featured Content" },
      { key: "footer", label: "Footer Content" },
    ],
  },
];

export const STATIC_PAGE_TYPES = ["homepage", "policy", "faq", "static"] as const satisfies readonly PageType[];
export const DYNAMIC_PAGE_TYPES = ["landing", "campaign", "collection", "category", "blog"] as const satisfies readonly PageType[];

export function pageKindForType(type: PageType): PageKind {
  return (DYNAMIC_PAGE_TYPES as readonly string[]).includes(type) ? "dynamic" : "static";
}

export function isBlockPageFields(fields: unknown): fields is BlockPageFields {
  return (
    typeof fields === "object" &&
    fields !== null &&
    !Array.isArray(fields) &&
    (fields as { editor?: unknown }).editor === "blocks" &&
    Array.isArray((fields as { blocks?: unknown }).blocks)
  );
}

export interface CmsMediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReusableSectionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  blocks: ContentBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface PagePreviewLink {
  url: string;
}

export const BLOCK_LIBRARY: Array<{ type: ContentBlock["type"]; label: string; description: string }> = [
  { type: "heading", label: "Heading", description: "A title or section heading" },
  { type: "paragraph", label: "Paragraph", description: "Body copy" },
  { type: "image", label: "Image", description: "A single image from the media library" },
  { type: "video", label: "Video", description: "An embedded video URL" },
  { type: "button", label: "Button", description: "A link styled as a button" },
  { type: "banner", label: "Banner", description: "A wide promotional banner" },
  { type: "gallery", label: "Gallery", description: "A row of images" },
  { type: "columns", label: "Columns", description: "Two or three columns of content" },
  { type: "testimonials", label: "Testimonials", description: "Quotes from customers" },
  { type: "faq", label: "FAQ", description: "Questions and answers" },
  { type: "custom_section", label: "Custom Section", description: "A reusable or one-off section" },
  { type: "product_grid", label: "Product Grid", description: "Products from a collection, category, or campaign" },
];
