import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CmsPageView } from "@/components/cms/cms-page-view";
import { getPublishedCmsPage } from "@/lib/cms";

function queryString(searchParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedCmsPage(slug);
  if (!page) return { title: "Page Not Found", robots: { index: false } };

  const prettyPath: Record<string, string> = {
    home: "/",
    "privacy-policy": "/privacy",
    terms: "/terms",
    about: "/about",
    contact: "/contact",
    shipping: "/shipping",
    returns: "/returns",
    faq: "/pages/faq",
  };
  const path =
    page.seoCanonicalUrl ??
    prettyPath[page.slug] ??
    (page.type === "campaign" ? `/campaign/${page.slug}` : `/pages/${page.slug}`);
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    alternates: { canonical: page.seoCanonicalUrl ?? path },
    openGraph: page.seoOgImage
      ? { title: page.seoTitle ?? page.title, images: [page.seoOgImage] }
      : { title: page.seoTitle ?? page.title },
  };
}

export default async function CmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const page = await getPublishedCmsPage(slug);
  if (!page) notFound();
  if (page.type === "campaign") {
    const qs = queryString(await searchParams);
    redirect(`/campaign/${slug}${qs}`);
  }
  return <CmsPageView page={page} />;
}
