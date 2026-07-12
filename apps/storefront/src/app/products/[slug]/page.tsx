import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PdpView } from "@/components/pdp/pdp-view";

import type { ApiResponse, PdpProduct } from "@ecom/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getProduct(slug: string): Promise<PdpProduct | null> {
  const res = await fetch(`${API_URL}/products/${slug}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  const body = (await res.json()) as ApiResponse<PdpProduct>;
  if (!body.success) return null;
  return body.data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.seo?.metaTitle ?? product.title,
    description: product.seo?.metaDescription ?? product.description ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return <PdpView product={product} />;
}
