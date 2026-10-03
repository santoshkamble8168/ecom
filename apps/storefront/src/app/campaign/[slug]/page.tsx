import type { Metadata } from "next";
import { Suspense } from "react";

import { DynamicTemplateView } from "@/components/cms/dynamic-template-view";
import { PlpView } from "@/components/discovery/plp-view";
import { getPublishedDynamicPage } from "@/lib/cms";

function titleFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = titleFromSlug(slug);
  return {
    title,
    description: `Shop the ${title} campaign`,
    alternates: { canonical: `/campaign/${slug}` },
  };
}

export default async function CampaignLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = titleFromSlug(slug);

  const page = await getPublishedDynamicPage("campaign", slug);
  const grid = (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading campaign…</div>}>
      <PlpView title={page?.title ?? title} apiPath={`/campaigns/${slug}/products`} />
    </Suspense>
  );
  if (!page) return grid;
  return <DynamicTemplateView page={page} grid={grid} />;
}
