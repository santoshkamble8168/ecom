import type { HomepageFields, HomepageSummary, PageDetail } from "@ecom/types";

import { CmsPageSections } from "@/components/cms/page-sections";
import { HomepageSections } from "@/components/home/homepage-sections";
import { StorefrontRecommendationRail } from "@/components/recommendations/recommendation-rail";
import { apiFetch } from "@/lib/api";

/** Slug seeded for the CMS homepage in `apps/api/prisma/seeds/cms.seed.ts`. */
const CMS_HOMEPAGE_SLUG = "home";

export default async function HomePage() {
  try {
    const page = await apiFetch<PageDetail>(`/cms/pages/${CMS_HOMEPAGE_SLUG}`);
    if (page.type === "homepage") {
      return (
        <>
          <CmsPageSections sections={(page.fields as HomepageFields).sections} />
          <StorefrontRecommendationRail slot="homepage_trending" />
        </>
      );
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
