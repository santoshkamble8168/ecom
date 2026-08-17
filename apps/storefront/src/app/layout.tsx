import type { MenuSummary, NavigationSummary } from "@ecom/types";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { apiFetch } from "@/lib/api";
import { menuItemsToNavigationNodes } from "@/lib/cms-navigation";

import "./globals.css";

const FALLBACK_NAV: NavigationSummary = {
  announcement: { message: "Free shipping on orders above ₹999", linkUrl: null, linkLabel: null },
  header: [
    { label: "Men", href: "/men" },
    { label: "Women", href: "/women" },
    { label: "New Arrivals", href: "/collections/new-arrivals" },
  ],
  footer: { shop: [], support: [], legal: [] },
};

/** Menu `code`s seeded in `apps/api/prisma/seeds/cms.seed.ts`. */
const MAIN_NAV_MENU_CODE = "main-nav";
const FOOTER_NAV_MENU_CODE = "footer";

export const metadata: Metadata = {
  title: {
    default: "Ecom Storefront",
    template: "%s | Ecom",
  },
  description: "Production-grade commerce storefront built with Next.js and NestJS.",
};

async function loadNavigation(): Promise<NavigationSummary> {
  let navigation: NavigationSummary;
  try {
    navigation = await apiFetch<NavigationSummary>("/navigation");
  } catch {
    navigation = FALLBACK_NAV;
  }

  // CMS-authored menus (when published) take precedence over the legacy
  // `/navigation` response and the hardcoded fallback above, per the "fully
  // operational CMS" requirement — but either falls straight back to
  // `navigation` as computed above when the corresponding menu is missing.
  const [mainNav, footerNav] = await Promise.allSettled([
    apiFetch<MenuSummary>(`/cms/menus/${MAIN_NAV_MENU_CODE}`),
    apiFetch<MenuSummary>(`/cms/menus/${FOOTER_NAV_MENU_CODE}`),
  ]);

  if (mainNav.status === "fulfilled" && mainNav.value.items.length > 0) {
    navigation = { ...navigation, header: menuItemsToNavigationNodes(mainNav.value.items) };
  }

  if (footerNav.status === "fulfilled" && footerNav.value.items.length > 0) {
    navigation = {
      ...navigation,
      footer: { ...navigation.footer, support: menuItemsToNavigationNodes(footerNav.value.items) },
    };
  }

  return navigation;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const navigation = await loadNavigation();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <SiteHeader navigation={navigation} />
            <main className="flex-1">{children}</main>
            <SiteFooter navigation={navigation} />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
