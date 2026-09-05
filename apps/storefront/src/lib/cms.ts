import type { ApiResponse, BannerPlacement, BannerSummary, PageDetail } from "@ecom/types";

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

export async function getPublishedCmsPage(slug: string): Promise<PageDetail | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/cms/pages/${slug}`, { next: { revalidate: 60 } });
  } catch (err) {
    console.error(`[CMS Page] Failed to reach API for "${slug}":`, err);
    return null;
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[CMS Page] API returned ${res.status} for "${slug}"`);
    return null;
  }

  try {
    const body = (await res.json()) as ApiResponse<PageDetail>;
    if (!body.success) return null;
    return body.data;
  } catch (err) {
    console.error(`[CMS Page] Failed to parse API response for "${slug}":`, err);
    return null;
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
