export function publicPagePath(page: { slug: string; type?: string | null }): string | null {
  if (page.slug === "home" || page.type === "homepage") return "/";
  if (page.type === "campaign") return `/campaign/${page.slug}`;
  if (page.type === "collection") return `/collections/${page.slug}`;
  if (page.type === "category") return `/categories/${page.slug}`;
  if (page.type === "blog") return page.slug === "blog" ? "/blog" : `/pages/${page.slug}`;
  const pretty: Record<string, string> = {
    "privacy-policy": "/privacy",
    terms: "/terms",
    about: "/about",
    contact: "/contact",
    shipping: "/shipping",
    returns: "/returns",
    faq: "/pages/faq",
  };
  return pretty[page.slug] ?? `/pages/${page.slug}`;
}
