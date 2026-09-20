import type { HomepageFields, HomepageSummary, PageDetail } from "@ecom/types";
import type { Metadata } from "next";

import { CmsPageSections } from "@/components/cms/page-sections";
import { HomepageSections } from "@/components/home/homepage-sections";
import { StorefrontRecommendationRail } from "@/components/recommendations/recommendation-rail";
import { apiFetch } from "@/lib/api";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

/** Slug seeded for the CMS homepage in `apps/api/prisma/seeds/cms.seed.ts`. */
const CMS_HOMEPAGE_SLUG = "home";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await metadataForCmsSlug("home", {
    title: "Ecom | T-Shirts Made for Every Day",
    description:
      "Clean cotton tees for everyday wear. Classic crew, oversized graphics, and easy returns. Free shipping above ₹999.",
    path: "/",
  });
  return { ...meta, title: { absolute: typeof meta.title === "string" ? meta.title : "Ecom | T-Shirts Made for Every Day" } };
}

export default async function HomePage() {
  try {
    const page = await apiFetch<PageDetail>(`/cms/pages/${CMS_HOMEPAGE_SLUG}`, { cache: "no-store" });
    if (page.type === "homepage") {
      return <CmsPageSections sections={(page.fields as HomepageFields).sections} />;
    }
  } catch {
    // No published CMS homepage (404) or API error — fall back to the
    // legacy hardcoded `/home` blocks below exactly as before this change.
  }

  let homepage: HomepageSummary;
  try {
    homepage = await apiFetch<HomepageSummary>("/home");
  } catch {
    homepage = { blocks: [] };
  }

  return (
    <>
      <HomepageSections blocks={homepage.blocks} />
      <StorefrontRecommendationRail slot="homepage_trending" />
    </>
  );
}
