import { Suspense } from "react";

import { PlpView } from "@/components/discovery/plp-view";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView title={title} apiPath={`/categories/${slug}/products`} />
    </Suspense>
  );
}
