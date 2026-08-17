import type { BannerSummary } from "@ecom/types";
import { Suspense } from "react";

import { BannerPlacementStrip } from "@/components/cms/banner-placement-strip";
import { PlpView } from "@/components/discovery/plp-view";
import { apiFetch } from "@/lib/api";

async function CategoryTopBanner() {
  let banners: BannerSummary[] = [];
  try {
    banners = await apiFetch<BannerSummary[]>("/cms/banners?placement=category_top");
  } catch {
    banners = [];
  }
  return <BannerPlacementStrip banners={banners} />;
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <CategoryTopBanner />
      <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
        <PlpView title={title} apiPath={`/categories/${slug}/products`} />
      </Suspense>
    </>
  );
}
