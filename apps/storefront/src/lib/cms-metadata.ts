import type { PageDetail } from "@ecom/types";
import type { Metadata } from "next";

import { getPublishedCmsPage } from "./cms";

export async function metadataForCmsSlug(
  slug: string,
  fallback: { title: string; description: string; path: string },
): Promise<Metadata> {
  const page = await getPublishedCmsPage(slug);
  return metadataFromCmsPage(page, fallback);
}

export function metadataFromCmsPage(
  page: PageDetail | null,
  fallback: { title: string; description: string; path: string },
): Metadata {
  const title = page?.seoTitle || page?.title || fallback.title;
  const description = page?.seoDescription || fallback.description;
  const canonical = page?.seoCanonicalUrl || fallback.path;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: fallback.path,
      images: page?.seoOgImage ? [page.seoOgImage] : undefined,
    },
  };
}
