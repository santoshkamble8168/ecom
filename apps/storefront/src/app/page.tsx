import type { HomepageSummary } from "@ecom/types";

import { HomepageSections } from "@/components/home/homepage-sections";
import { apiFetch } from "@/lib/api";

export default async function HomePage() {
  let homepage: HomepageSummary;
  try {
    homepage = await apiFetch<HomepageSummary>("/home");
  } catch {
    homepage = { blocks: [] };
  }

  return <HomepageSections blocks={homepage.blocks} />;
}
