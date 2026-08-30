/** Storefront origin used for canonical URLs, Open Graph, sitemap, and robots. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${normalized}`;
}

/** Private or transactional paths that must not be indexed. */
export const ROBOTS_DISALLOW = [
  "/account",
  "/checkout",
  "/cart",
  "/order",
  "/wishlist",
  "/track",
  "/pages/*/preview",
] as const;
