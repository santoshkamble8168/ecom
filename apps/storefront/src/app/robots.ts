import type { MetadataRoute } from "next";

import { ROBOTS_DISALLOW, siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
