import type { ApiResponse, BannerPlacement, BannerSummary } from "@ecom/types";

import { getApiUrl } from "./api-url";

const API_URL = getApiUrl();
const ALL_PLACEMENTS: BannerPlacement[] = ["homepage_hero", "homepage_strip", "category_top", "cart_strip"];

async function getBannersByPlacement(placement: BannerPlacement): Promise<BannerSummary[]> {
  try {
    const res = await fetch(`${API_URL}/cms/banners?placement=${placement}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<BannerSummary[]>;
    return body.success ? body.data : [];
  } catch (err) {
    console.error(`[CMS] Failed to load banners for placement "${placement}":`, err);
    return [];
  }
}

/**
 * There is no public single/batch banner-by-id endpoint, so `hero_banner`
 * and `banner_strip` sections (which only carry banner ids) are resolved by
 * broadening across every known placement and filtering client-side, per
 * the task guidance. Cheap in practice since there are only 4 placements.
 */
export async function getBannersByIds(ids: string[]): Promise<Map<string, BannerSummary>> {
  const map = new Map<string, BannerSummary>();
  if (ids.length === 0) return map;

  const idSet = new Set(ids);
  const lists = await Promise.all(ALL_PLACEMENTS.map((placement) => getBannersByPlacement(placement)));
  for (const list of lists) {
    for (const banner of list) {
      if (idSet.has(banner.id)) map.set(banner.id, banner);
    }
  }
  return map;
}
