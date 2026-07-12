import type { HomepageBlock } from "@ecom/types";
import { ProductCard } from "@ecom/ui";
import Link from "next/link";

import { NewsletterForm } from "./newsletter-form";

function HeroSection({ block }: { block: Extract<HomepageBlock, { type: "hero" }> }) {
  return (
    <section className="relative overflow-hidden bg-neutral-900 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col gap-4">
          {block.badge && (
            <span className="w-fit rounded-full bg-accent-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {block.badge}
            </span>
          )}
          <h1 className="text-4xl font-display font-bold sm:text-5xl">{block.headline}</h1>
          <p className="text-lg text-neutral-300">{block.subheadline}</p>
          <div>
            <Link
              href={block.ctaHref}
              className="inline-flex h-12 items-center justify-center rounded-md bg-accent-600 px-6 text-base font-bold uppercase tracking-wide text-white hover:bg-accent-700"
            >
              {block.ctaLabel}
            </Link>
          </div>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.imageUrl} alt={block.headline} className="h-full w-full object-cover" />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.label}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
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
  return (
    <section className="border-t border-neutral-200 bg-neutral-50 py-12 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-3">
        {block.items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
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
