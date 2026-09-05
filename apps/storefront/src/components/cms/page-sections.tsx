import type { BannerSummary, PageSection, ProductListResult } from "@ecom/types";
import { ProductCard } from "@ecom/ui";
import Link from "next/link";

import { CampaignLink } from "@/components/analytics/campaign-link";
import { StorefrontImage } from "@/components/media/storefront-image";
import { apiFetch } from "@/lib/api";
import { getBannersByIds } from "@/lib/cms";

import { RichHtml } from "./rich-html";

type CollectionGridSectionData = Extract<PageSection, { kind: "collection_grid" }>;
type CampaignGridSectionData = Extract<PageSection, { kind: "campaign_grid" }>;
type RichTextSectionData = Extract<PageSection, { kind: "rich_text" }>;

function HeroBannerSection({ banner }: { banner: BannerSummary }) {
  const image = (
    <div className="relative aspect-[21/9] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 sm:aspect-[3/1]">
      <StorefrontImage
        src={banner.imageUrl}
        alt={banner.altText ?? banner.title}
        className="object-cover"
        sizes="100vw"
        priority
      />
    </div>
  );

  return (
    <section className="w-full">
      {banner.linkUrl ? (
        <CampaignLink href={banner.linkUrl} campaignId={banner.id} ariaLabel={banner.title}>
          {image}
        </CampaignLink>
      ) : (
        image
      )}
    </section>
  );
}

function BannerStripSection({ banners }: { banners: BannerSummary[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => {
          const image = (
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
              <StorefrontImage
                src={banner.imageUrl}
                alt={banner.altText ?? banner.title}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
            </div>
          );
          return (
            <div key={banner.id}>
              {banner.linkUrl ? (
                <CampaignLink href={banner.linkUrl} campaignId={banner.id} ariaLabel={banner.title}>
                  {image}
                </CampaignLink>
              ) : (
                image
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

async function CollectionGridSection({ section }: { section: CollectionGridSectionData }) {
  const pageSize = section.limit ?? 8;
  let result: ProductListResult | null = null;
  try {
    result = await apiFetch<ProductListResult>(
      `/collections/${encodeURIComponent(section.collectionSlug)}/products?page=1&pageSize=${pageSize}`,
    );
  } catch (err) {
    console.error(`[CMS] Failed to load collection_grid products for "${section.collectionSlug}":`, err);
  }

  const products = result?.items ?? [];
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">{section.title}</h2>
        <Link
          href={`/collections/${section.collectionSlug}`}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <Link key={product.slug} href={`/products/${product.slug}`}>
            <ProductCard product={product} showStatus={false} />
          </Link>
        ))}
      </div>
    </section>
  );
}

async function CampaignGridSection({ section }: { section: CampaignGridSectionData }) {
  let result: ProductListResult | null = null;
  try {
    result = await apiFetch<ProductListResult>(
      `/campaigns/${encodeURIComponent(section.campaignSlug)}/products?page=1&pageSize=8`,
    );
  } catch (err) {
    console.error(`[CMS] Failed to load campaign_grid products for "${section.campaignSlug}":`, err);
  }

  const products = result?.items ?? [];
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="mb-6 text-2xl font-display font-bold">{section.title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <Link key={product.slug} href={`/products/${product.slug}`}>
            <ProductCard product={product} showStatus={false} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function RichTextSection({ section }: { section: RichTextSectionData }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {section.title && <h2 className="mb-4 text-2xl font-display font-bold">{section.title}</h2>}
      <RichHtml html={section.html} />
    </section>
  );
}

/**
 * Renders a `PageSection[]` (the fixed section vocabulary shared by the CMS
 * `homepage`, `landing`, and `campaign` page types). Server component only —
 * resolves banner ids up front, then lets `collection_grid` sections fetch
 * their own products so a slow collection doesn't block unrelated sections.
 */
export async function CmsPageSections({ sections }: { sections: PageSection[] }) {
  const bannerIds = new Set<string>();
  for (const section of sections) {
    if (section.kind === "hero_banner") bannerIds.add(section.bannerId);
    if (section.kind === "banner_strip") section.bannerIds.forEach((id) => bannerIds.add(id));
  }
  const bannerMap = await getBannersByIds([...bannerIds]);

  return (
    <>
      {sections.map((section, index) => {
        switch (section.kind) {
          case "hero_banner": {
            const banner = bannerMap.get(section.bannerId);
            return banner ? <HeroBannerSection key={index} banner={banner} /> : null;
          }
          case "banner_strip": {
            const banners = section.bannerIds
              .map((id) => bannerMap.get(id))
              .filter((b): b is BannerSummary => Boolean(b));
            return <BannerStripSection key={index} banners={banners} />;
          }
          case "collection_grid":
            return <CollectionGridSection key={index} section={section} />;
          case "campaign_grid":
            return <CampaignGridSection key={index} section={section} />;
          case "rich_text":
            return <RichTextSection key={index} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
