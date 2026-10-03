import { Suspense } from "react";
import type { Metadata } from "next";

import { DynamicTemplateView } from "@/components/cms/dynamic-template-view";
import { PlpView } from "@/components/discovery/plp-view";
import { getPublishedDynamicPage } from "@/lib/cms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title,
    description: `Shop the ${title} collection`,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const page = await getPublishedDynamicPage("collection", slug);
  const grid = (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView title={page?.title ?? title} apiPath={`/collections/${slug}/products`} />
    </Suspense>
  );
  if (!page) return grid;
  return <DynamicTemplateView page={page} grid={grid} />;
}
