export const ROBOTS_DISALLOW = [
  "/account",
  "/checkout",
  "/cart",
  "/order",
  "/wishlist",
  "/track",
  "/pages/*/preview",
] as const;

export function trimOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

export function absoluteUrl(origin: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${trimOrigin(origin)}${normalized}`;
}

const PRIVATE_PATH =
  /\/(auth|me\/|admin|cart|checkout|payments|orders|users|notification-preferences|analytics\/events)/i;
const PUBLIC_PATH =
  /\/(products|categories|collections|campaigns|cms|blog|navigation|home|search|attributes|delivery)/i;

/**
 * Cache-Control for API responses. Private/customer routes are never
 * shared-cached. Public catalog/CMS GETs may be cached at the edge for 60s.
 */
export function cacheControlForRequest(method: string, path: string): string {
  const normalized = (path.split("?")[0] ?? path).replace(/\/+$/, "") || "/";
  if (method !== "GET" && method !== "HEAD") return "private, no-store";
  if (normalized.endsWith("robots.txt") || normalized.endsWith("sitemap.xml")) {
    return "public, max-age=3600";
  }
  if (normalized.includes("/admin") || PRIVATE_PATH.test(normalized)) return "private, no-store";
  if (PUBLIC_PATH.test(normalized)) return "public, s-maxage=60, stale-while-revalidate=300";
  return "private, no-store";
}

export function buildRobotsTxt(storefrontOrigin: string): string {
  const origin = trimOrigin(storefrontOrigin);
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ];
  return lines.join("\n");
}

export function jsonLdOrganization(origin: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ecom",
    url: trimOrigin(origin),
    logo: absoluteUrl(origin, "/favicon.ico"),
  };
}

export function jsonLdWebSite(origin: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ecom",
    url: trimOrigin(origin),
    potentialAction: {
      "@type": "SearchAction",
      target: `${trimOrigin(origin)}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdBreadcrumb(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function jsonLdProduct(input: {
  name: string;
  description?: string | null;
  image?: string | null;
  url: string;
  sku?: string | null;
  price?: string | null;
  currency?: string;
  inStock?: boolean;
  ratingValue?: number | null;
  reviewCount?: number | null;
}): Record<string, unknown> {
  const offers = input.price
    ? {
        "@type": "Offer",
        price: input.price,
        priceCurrency: input.currency ?? "INR",
        availability: input.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        url: input.url,
      }
    : undefined;
  const aggregateRating =
    input.reviewCount && input.reviewCount > 0 && input.ratingValue
      ? {
          "@type": "AggregateRating",
          ratingValue: input.ratingValue,
          reviewCount: input.reviewCount,
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description ?? undefined,
    image: input.image ?? undefined,
    sku: input.sku ?? undefined,
    url: input.url,
    offers,
    aggregateRating,
  };
}

export function jsonLdArticle(input: {
  headline: string;
  description?: string | null;
  image?: string | null;
  url: string;
  datePublished?: string | null;
  authorName?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description ?? undefined,
    image: input.image ?? undefined,
    url: input.url,
    datePublished: input.datePublished ?? undefined,
    author: input.authorName ? { "@type": "Person", name: input.authorName } : undefined,
  };
}

export function jsonLdFaq(items: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export const SLOW_QUERY_MS = 200;
