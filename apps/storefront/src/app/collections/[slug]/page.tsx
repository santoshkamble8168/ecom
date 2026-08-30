import { Suspense } from "react";
import type { Metadata } from "next";

import { PlpView } from "@/components/discovery/plp-view";

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

  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView title={title} apiPath={`/collections/${slug}/products`} />
    </Suspense>
  );
}
