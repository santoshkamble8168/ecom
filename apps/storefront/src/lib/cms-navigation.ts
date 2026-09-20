import type { MenuItemSummary, NavigationNode } from "@ecom/types";

const HREF_ALIASES: Record<string, string> = {
  "/pages/privacy-policy": "/privacy",
  "/privacy-policy": "/privacy",
  "/pages/terms": "/terms",
  "/terms-and-conditions": "/terms",
  "/faqs": "/pages/faq",
  "/faq": "/pages/faq",
};

function canonicalHref(href: string): string {
  return HREF_ALIASES[href] ?? href;
}

/** Converts a recursive CMS `MenuItemSummary` tree into `NavigationNode[]`. */
export function menuItemsToNavigationNodes(items: MenuItemSummary[]): NavigationNode[] {
  return items
    .filter((item) => item.isActive)
    .map((item) => ({
      label: item.label,
      href: canonicalHref(item.url),
      children: item.children.length > 0 ? menuItemsToNavigationNodes(item.children) : undefined,
    }));
}
