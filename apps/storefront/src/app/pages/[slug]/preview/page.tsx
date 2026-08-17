import type { ApiResponse, PageDetail } from "@ecom/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsPageView } from "@/components/cms/cms-page-view";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

async function getPreviewPage(slug: string, token: string): Promise<PageDetail | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/cms/pages/${slug}/preview?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[CMS Preview] Failed to reach API for "${slug}":`, err);
    return null;
  }

  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) {
    console.error(`[CMS Preview] API returned ${res.status} for "${slug}"`);
    return null;
  }

  try {
    const body = (await res.json()) as ApiResponse<PageDetail>;
    if (!body.success) return null;
    return body.data;
  } catch (err) {
    console.error(`[CMS Preview] Failed to parse API response for "${slug}":`, err);
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { token } = await searchParams;
  if (!token) return { title: "Preview unavailable", robots: { index: false, follow: false } };
  const page = await getPreviewPage(slug, token);
  if (!page) return { title: "Preview unavailable", robots: { index: false, follow: false } };
  return {
    title: `Preview: ${page.seoTitle ?? page.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function CmsPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const page = await getPreviewPage(slug, token);
  if (!page) notFound();

  return (
    <div>
      <div className="bg-warning-50 px-4 py-2 text-center text-sm font-medium text-warning-700">
        Preview mode — this page is not live. Status: {page.status}
      </div>
      <CmsPageView page={page} />
    </div>
  );
}
