import type { ApiResponse, PdpProduct } from "@ecom/types";
import { jsonLdBreadcrumb, jsonLdProduct } from "@ecom/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PdpView } from "@/components/pdp/pdp-view";
import { JsonLd } from "@/components/seo/json-ld";
import { getApiUrl } from "@/lib/api-url";
import { absoluteUrl, siteOrigin } from "@/lib/seo";

const API_URL = getApiUrl();

async function getProduct(slug: string): Promise<PdpProduct | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/products/${slug}`, { next: { revalidate: 60 } });
  } catch (err) {
    // API unreachable (down, restarting, network hiccup) — degrade to the
    // "not found" page instead of crashing the whole route with a 500.
    console.error(`[PDP] Failed to reach API for "${slug}":`, err);
    return null;
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[PDP] API returned ${res.status} for "${slug}"`);
    return null;
  }

  try {
    const body = (await res.json()) as ApiResponse<PdpProduct>;
    if (!body.success) return null;
    return body.data;
  } catch (err) {
    console.error(`[PDP] Failed to parse API response for "${slug}":`, err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found", robots: { index: false } };
  const path = `/products/${product.slug}`;
  return {
    title: product.seo?.metaTitle ?? product.title,
    description: product.seo?.metaDescription ?? product.description ?? undefined,
    alternates: { canonical: product.seo?.canonicalUrl ?? path },
    openGraph: {
      title: product.seo?.metaTitle ?? product.title,
      description: product.seo?.metaDescription ?? product.description ?? undefined,
      url: path,
      images: product.primaryImage?.url ? [product.primaryImage.url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const origin = siteOrigin();
  const url = absoluteUrl(`/products/${product.slug}`);
  const price = product.effectivePrice ?? product.basePrice;

  return (
    <>
      <JsonLd
        data={[
          jsonLdProduct({
            name: product.title,
            description: product.description,
            image: product.primaryImage?.url,
            url,
            sku: product.variants[0]?.sku,
            price,
            inStock: product.inStock,
            ratingValue: product.reviewSummary.averageRating,
            reviewCount: product.reviewSummary.totalReviews,
          }),
          jsonLdBreadcrumb([
            { name: "Home", url: origin },
            { name: "Shop", url: absoluteUrl("/men") },
            { name: product.title, url },
          ]),
        ]}
      />
      <PdpView product={product} />
    </>
  );
}
