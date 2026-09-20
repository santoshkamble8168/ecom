import type { HomepageBlock } from "@ecom/types";
import { ProductCard } from "@ecom/ui";
import Link from "next/link";

import { CampaignLink } from "@/components/analytics/campaign-link";
import { TrustStrip } from "@/components/cms/trust-strip";
import { StorefrontImage } from "@/components/media/storefront-image";
import { NewsletterForm } from "./newsletter-form";

function HeroSection({ block }: { block: Extract<HomepageBlock, { type: "hero" }> }) {
  return (
    <section className="relative min-h-[70vh] overflow-hidden bg-neutral-900 text-white">
      <div className="absolute inset-0">
        <StorefrontImage src={block.imageUrl} alt={block.headline} className="object-cover" sizes="100vw" priority />
      </div>
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[70vh] max-w-7xl flex-col justify-end gap-4 px-4 py-16 md:justify-center md:py-24">
        {block.badge && (
          <span className="w-fit rounded-sm bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {block.badge}
          </span>
        )}
        <h1 className="max-w-xl text-4xl font-display font-bold sm:text-5xl">{block.headline}</h1>
        <p className="max-w-xl text-lg text-neutral-200">{block.subheadline}</p>
        <div>
          <CampaignLink
            href={block.ctaHref}
            campaignId="homepage-hero"
            className="inline-flex h-12 items-center justify-center rounded-md bg-accent-500 px-6 text-base font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
          >
            {block.ctaLabel}
          </CampaignLink>
        </div>
      </div>
    </section>
  );
}

function SocialProofSection({ block }: { block: Extract<HomepageBlock, { type: "social-proof" }> }) {
  return (
    <section className="border-b border-neutral-200 bg-white py-8 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 text-center">
        {block.items.map((item) => (
          <div key={item.label}>
            <p className="text-2xl font-display font-bold text-brand-700">{item.value}</p>
            <p className="text-sm text-neutral-500">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShopByGenderSection({ block }: { block: Extract<HomepageBlock, { type: "shop-by-gender" }> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="mb-6 text-2xl font-display font-bold">{block.title}</h2>
      <div className="grid grid-cols-2 gap-4">
        {block.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl"
          >
            <StorefrontImage
              src={item.imageUrl}
              alt={item.label}
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-4 left-4 text-xl font-display font-bold text-white">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CollectionRailSection({ block }: { block: Extract<HomepageBlock, { type: "collection-rail" }> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="mb-6 text-2xl font-display font-bold">{block.title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {block.collections.map((col) => (
          <Link
            key={col.slug}
            href={`/collections/${col.slug}`}
            className="rounded-xl border border-neutral-200 p-6 transition-shadow hover:shadow-md dark:border-neutral-800"
          >
            <h3 className="font-semibold">{col.name}</h3>
            {col.description && (
              <p className="mt-1 text-sm text-neutral-500">{col.description}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductRailSection({ block }: { block: Extract<HomepageBlock, { type: "product-rail" }> }) {
  if (block.products.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">{block.title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {block.products.map((product) => (
          <Link key={product.slug} href={`/products/${product.slug}`}>
            <ProductCard product={product} showStatus={false} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrustBadgesSection({ block }: { block: Extract<HomepageBlock, { type: "trust-badges" }> }) {
  return <TrustStrip title="Why shop with us" items={block.items} />;
}

function NewsletterSection({ block }: { block: Extract<HomepageBlock, { type: "newsletter" }> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="rounded-2xl bg-brand-700 px-6 py-10 text-center text-white sm:px-12">
        <h2 className="text-2xl font-display font-bold">{block.title}</h2>
        <p className="mx-auto mt-2 max-w-md text-brand-100">{block.description}</p>
        <NewsletterForm placeholder={block.placeholder} ctaLabel={block.ctaLabel} />
      </div>
    </section>
  );
}

export function HomepageSections({ blocks }: { blocks: HomepageBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero":
            return <HeroSection key={i} block={block} />;
          case "social-proof":
            return <SocialProofSection key={i} block={block} />;
          case "shop-by-gender":
            return <ShopByGenderSection key={i} block={block} />;
          case "collection-rail":
            return <CollectionRailSection key={i} block={block} />;
          case "product-rail":
            return <ProductRailSection key={i} block={block} />;
          case "trust-badges":
            return <TrustBadgesSection key={i} block={block} />;
          case "newsletter":
            return <NewsletterSection key={i} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
