import { PERMISSIONS, type Permission } from "@ecom/types";

export interface AdminNavItem {
  href: string;
  label: string;
  permissions: readonly Permission[];
  badge?: string;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const POST_LOGIN_PATH = "/";
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "Home",
    items: [{ href: "/", label: "Dashboard", permissions: [PERMISSIONS.DASHBOARD_READ] }],
  },
  {
    title: "Catalog",
    items: [
      { href: "/products", label: "Products", permissions: [PERMISSIONS.CATALOG_READ] },
      { href: "/categories", label: "Categories", permissions: [PERMISSIONS.CATALOG_READ] },
      { href: "/collections", label: "Collections", permissions: [PERMISSIONS.CATALOG_READ] },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/orders", label: "Orders", permissions: [PERMISSIONS.ORDER_READ] },
      { href: "/customers", label: "Customers", permissions: [PERMISSIONS.CUSTOMER_READ] },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/inventory", label: "Stock", permissions: [PERMISSIONS.INVENTORY_READ] },
      { href: "/inventory/movements", label: "Movements", permissions: [PERMISSIONS.INVENTORY_READ] },
      { href: "/inventory/warehouses", label: "Warehouses", permissions: [PERMISSIONS.INVENTORY_READ] },
      { href: "/inventory/suppliers", label: "Suppliers", permissions: [PERMISSIONS.INVENTORY_READ] },
      { href: "/inventory/purchase-orders", label: "Purchase Orders", permissions: [PERMISSIONS.INVENTORY_READ] },
    ],
  },
  {
    title: "Pricing",
    items: [
      { href: "/pricing", label: "Prices", permissions: [PERMISSIONS.PRICING_READ] },
      { href: "/pricing/price-lists", label: "Price Lists", permissions: [PERMISSIONS.PRICING_READ] },
      { href: "/pricing/tax-rules", label: "Tax Rules", permissions: [PERMISSIONS.PRICING_READ] },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/coupons", label: "Coupons", permissions: [PERMISSIONS.PROMOTION_READ] },
      { href: "/campaigns", label: "Campaigns", permissions: [PERMISSIONS.PROMOTION_READ] },
      {
        href: "/marketing",
        label: "Referrals, Gift Cards & Loyalty",
        permissions: [PERMISSIONS.ADMIN_ACCESS],
        badge: "Preview",
      },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/pages", label: "Pages", permissions: [PERMISSIONS.ADMIN_ACCESS] },
      { href: "/banners", label: "Banners", permissions: [PERMISSIONS.ADMIN_ACCESS] },
      { href: "/menus", label: "Menus", permissions: [PERMISSIONS.ADMIN_ACCESS] },
      { href: "/blog", label: "Blog Posts", permissions: [PERMISSIONS.ADMIN_ACCESS] },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", permissions: [PERMISSIONS.ANALYTICS_READ] },
      { href: "/reports", label: "Reports", permissions: [PERMISSIONS.REPORT_READ] },
      { href: "/recommendations", label: "Recommendations", permissions: [PERMISSIONS.RECOMMENDATION_READ] },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/users", label: "Users & Roles", permissions: [PERMISSIONS.USER_READ] },
      { href: "/audit-logs", label: "Audit logs", permissions: [PERMISSIONS.AUDIT_READ] },
      { href: "/feature-flags", label: "Feature flags", permissions: [PERMISSIONS.FEATURE_FLAG_READ] },
      { href: "/settings", label: "Settings", permissions: [PERMISSIONS.SETTINGS_READ] },
      { href: "/notifications/templates", label: "Templates", permissions: [PERMISSIONS.NOTIFICATION_READ] },
      { href: "/notifications/deliveries", label: "Deliveries", permissions: [PERMISSIONS.NOTIFICATION_READ] },
    ],
  },
];

export function allAdminNavHrefs(): string[] {
  return ADMIN_NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href));
}

/** Longest matching href wins so /inventory/movements does not highlight Stock. */
export function isAdminNavActive(href: string, pathname: string, hrefs: string[]): boolean {
  if (href === "/") return pathname === "/";
  const matches = hrefs.filter(
    (candidate) => candidate !== "/" && (pathname === candidate || pathname.startsWith(`${candidate}/`)),
  );
  const best = [...matches].sort((a, b) => b.length - a.length)[0];
  return best === href;
}
