import type { MenuItemSummary, NavigationNode } from "@ecom/types";

/** Converts a recursive CMS `MenuItemSummary` tree into `NavigationNode[]`. */
export function menuItemsToNavigationNodes(items: MenuItemSummary[]): NavigationNode[] {
  return items
    .filter((item) => item.isActive)
    .map((item) => ({
      label: item.label,
      href: item.url,
      children: item.children.length > 0 ? menuItemsToNavigationNodes(item.children) : undefined,
    }));
}
