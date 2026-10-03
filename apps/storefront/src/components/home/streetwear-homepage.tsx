import type { ProductListResult, ProductSummary } from "@ecom/types";
import { buttonVariants, ProductCard } from "@ecom/ui";
import Image from "next/image";
import Link from "next/link";

import { TrustStrip } from "@/components/cms/trust-strip";
import { apiFetch } from "@/lib/api";

const FALLBACK_PRODUCTS: ProductSummary[] = [
  {
    slug: "classic-crew-neck-tee",
    title: "Classic Crew Neck T-Shirt",
    brand: "ECOM",
    status: "published",
    basePrice: "499.00",
    compareAtPrice: "799.00",
    primaryImage: {
      url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900",
      altText: "Classic black t-shirt",
      type: "image",
      sortOrder: 0,
    },
    categorySlugs: ["men-t-shirts"],
    publishedAt: null,
  },
  {
    slug: "oversized-graphic-tee",
    title: "Oversized Graphic Tee",
    brand: "ECOM",
    status: "published",
    basePrice: "699.00",
    compareAtPrice: "999.00",
    primaryImage: {
      url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900",
      altText: "Black graphic t-shirt",
      type: "image",
      sortOrder: 0,
    },
    categorySlugs: ["men-t-shirts"],
    publishedAt: null,
  },
  {
    slug: "womens-basic-vneck-tee",
    title: "Women's Essential Tee",
    brand: "ECOM",
    status: "published",
    basePrice: "449.00",
    compareAtPrice: "699.00",
    primaryImage: {
      url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=900",
      altText: "Women's everyday t-shirt",
      type: "image",
      sortOrder: 0,
    },
    categorySlugs: ["women-t-shirts"],
    publishedAt: null,
  },
  {
    slug: "classic-crew-neck-tee",
    title: "After Dark Crew Tee",
    brand: "ECOM",
    status: "published",
    basePrice: "599.00",
    compareAtPrice: "899.00",
    primaryImage: {
      url: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=900",
      altText: "Streetwear t-shirt",
      type: "image",
      sortOrder: 0,
    },
    categorySlugs: ["men-t-shirts"],
    publishedAt: null,
  },
];

const VIBES = [
  {
    label: "Everyday",
    href: "/collections/best-sellers",
    image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=700",
  },
  {
    label: "Graphic",
    href: "/collections/graphic-tees",
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=700",
  },
  {
    label: "Oversized",
    href: "/t-shirts",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=700",
  },
  {
    label: "Minimal",
    href: "/women",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=700",
  },
  {
    label: "New drop",
    href: "/collections/new-arrivals",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=700",
  },
];

const COMMUNITY = [
  {
    src: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=900",
    alt: "Customer wearing a casual t-shirt outdoors",
  },
  {
    src: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900",
    alt: "Friends in streetwear",
  },
  {
    src: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=900",
    alt: "Streetwear style in the city",
  },
  {
    src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900",
    alt: "T-shirt detail",
  },
];

function SectionHeading({ eyebrow, title, href }: { eyebrow?: string; title: string; href?: string }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          View all
        </Link>
      )}
    </div>
  );
}

function ProductTile({ product, index }: { product: ProductSummary; index: number }) {
  const fallbackImage = FALLBACK_PRODUCTS[index % FALLBACK_PRODUCTS.length]!.primaryImage;
  const displayProduct = product.primaryImage ? product : { ...product, primaryImage: fallbackImage };

  return (
    <Link href={`/products/${product.slug}`} className="group block min-w-0">
      <ProductCard
        product={displayProduct}
        showStatus={false}
        campaignBadge={index === 0 ? "Bestseller" : index === 1 ? "New" : null}
        className="rounded-lg"
      />
    </Link>
  );
}

async function getTrendingProducts() {
  try {
    const result = await apiFetch<ProductListResult>("/collections/best-sellers/products?page=1&pageSize=4", {
      cache: "no-store",
    });
    return result.items.length > 0 ? result.items : FALLBACK_PRODUCTS;
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export async function StreetwearHomepage() {
  const products = await getTrendingProducts();

  return (
    <div className="overflow-hidden bg-neutral-50 text-neutral-900">
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="relative min-h-[520px] overflow-hidden rounded-lg sm:min-h-[610px]">
          <Image
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1800"
            alt="Friends wearing contemporary streetwear"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/45 to-transparent" />
          <div className="relative flex min-h-[520px] max-w-2xl flex-col justify-center px-6 py-16 sm:min-h-[610px] sm:px-12 lg:px-16">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-500">New season / 2026</p>
            <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight text-white">
              Future Streets
            </h1>
            <p className="mt-7 max-w-md text-sm leading-6 text-slate-200 sm:text-base">
              Fresh fits for loud days. Premium cotton, graphic energy and silhouettes built to move.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/collections/new-arrivals"
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                Shop the drop
              </Link>
              <Link
                href="/t-shirts"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white bg-white/10 px-6 text-base font-medium text-white transition-colors hover:bg-white hover:text-neutral-950"
              >
                Explore all
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading title="Pick your vibe" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {VIBES.map((vibe) => (
            <Link
              key={vibe.label}
              href={vibe.href}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-200 last:col-span-2 sm:last:col-span-1"
            >
              <Image
                src={vibe.image}
                alt={vibe.label}
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                className="object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">
                {vibe.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Fresh right now" title="Trending now" href="/collections/best-sellers" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
          {products.slice(0, 4).map((product, index) => (
            <ProductTile key={`${product.slug}-${index}`} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-lg bg-brand-700 px-7 py-10 text-white sm:px-12 sm:py-14 lg:min-h-[440px]">
          <div className="relative z-10 max-w-xl lg:w-1/2">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-100">Limited artist drop</p>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              The Artist Series 01
            </h2>
            <p className="mt-6 max-w-md text-sm leading-6 text-brand-100">
              Wear the canvas. Our debut artist capsule turns original work into bold, limited-run graphics.
            </p>
            <Link
              href="/collections/graphic-tees"
              className={`${buttonVariants({ variant: "primary", size: "lg" })} mt-8`}
            >
              Explore the collection
            </Link>
          </div>
          <div className="relative mt-10 aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 lg:absolute lg:bottom-8 lg:right-8 lg:top-8 lg:mt-0 lg:w-[44%]">
            <Image
              src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200"
              alt="Limited edition artist graphic t-shirt"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionHeading eyebrow="Real people. Real style." title="Worn by you" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {COMMUNITY.map((image, index) => (
            <div
              key={image.src}
              className={`relative overflow-hidden rounded-lg bg-neutral-200 ${index % 2 === 0 ? "aspect-[4/3]" : "aspect-[4/3] lg:translate-y-5"}`}
            >
              <Image src={image.src} alt={image.alt} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      <TrustStrip
        title="Why shop with us"
        items={[
          { label: "Premium quality", description: "Heavyweight cotton selected for everyday wear." },
          { label: "Fresh drops", description: "New styles and limited collections added regularly." },
          { label: "Secure checkout", description: "Protected payments with UPI, cards, and net banking." },
        ]}
      />
    </div>
  );
}
