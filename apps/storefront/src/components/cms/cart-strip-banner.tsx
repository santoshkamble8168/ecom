"use client";

import type { BannerSummary } from "@ecom/types";
import { useEffect, useState } from "react";

import { getApiUrl } from "@/lib/api-url";

import { BannerPlacementStrip } from "./banner-placement-strip";

/** Client-side variant of the `category_top` banner fetch — the cart page is
 * a client component, so this can't reuse the server-fetch pattern used for
 * `category_top` in `app/categories/[slug]/page.tsx`. */
export function CartStripBanner() {
  const [banners, setBanners] = useState<BannerSummary[]>([]);

  useEffect(() => {
    fetch(`${getApiUrl()}/cms/banners?placement=cart_strip`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setBanners(body.data);
      })
      .catch(() => undefined);
  }, []);

  return <BannerPlacementStrip banners={banners} />;
}
