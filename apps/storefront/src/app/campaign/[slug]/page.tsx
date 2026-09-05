import type { Metadata } from "next";
import { Suspense } from "react";

import { PlpView } from "@/components/discovery/plp-view";

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

  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading campaign…</div>}>
      <PlpView title={title} apiPath={`/campaigns/${slug}/products`} />
    </Suspense>
  );
}
