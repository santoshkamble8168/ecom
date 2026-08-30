import type { ApiResponse, PageDetail } from "@ecom/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsPageView } from "@/components/cms/cms-page-view";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

async function getPage(slug: string): Promise<PageDetail | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/cms/pages/${slug}`, { next: { revalidate: 60 } });
  } catch (err) {
    console.error(`[CMS Page] Failed to reach API for "${slug}":`, err);
    return null;
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[CMS Page] API returned ${res.status} for "${slug}"`);
    return null;
  }

  try {
    const body = (await res.json()) as ApiResponse<PageDetail>;
    if (!body.success) return null;
    return body.data;
  } catch (err) {
    console.error(`[CMS Page] Failed to parse API response for "${slug}":`, err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Page Not Found", robots: { index: false } };

  const path = `/pages/${page.slug}`;
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    alternates: { canonical: page.seoCanonicalUrl ?? path },
    openGraph: page.seoOgImage
      ? { title: page.seoTitle ?? page.title, images: [page.seoOgImage] }
      : { title: page.seoTitle ?? page.title },
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  return <CmsPageView page={page} />;
}
