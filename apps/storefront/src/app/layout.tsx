import { jsonLdOrganization, jsonLdWebSite } from "@ecom/shared";
import type { MenuSummary, NavigationSummary } from "@ecom/types";
import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import type { ReactNode } from "react";

import { AnalyticsPageView } from "@/components/analytics/page-view-tracker";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { JsonLd } from "@/components/seo/json-ld";
import { apiFetch } from "@/lib/api";
import { menuItemsToNavigationNodes } from "@/lib/cms-navigation";
import { siteOrigin } from "@/lib/seo";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display" });

const FALLBACK_NAV: NavigationSummary = {
  announcement: { message: "Free shipping on orders above ₹999", linkUrl: null, linkLabel: null },
  header: [
    { label: "T-Shirts", href: "/t-shirts" },
    { label: "New Arrivals", href: "/collections/new-arrivals" },
    { label: "Best Sellers", href: "/collections/best-sellers" },
    { label: "About", href: "/about" },
  ],
  footer: { shop: [], support: [], legal: [] },
};

/** Menu `code`s seeded in `apps/api/prisma/seeds/cms.seed.ts`. */
const MAIN_NAV_MENU_CODE = "main-nav";
const FOOTER_NAV_MENU_CODE = "footer";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Ecom | T-Shirts Made for Every Day",
    template: "%s | Ecom",
  },
  description:
    "Clean cotton tees for everyday wear. Classic crew, oversized graphics, and easy returns. Free shipping above ₹999.",
  keywords: ["tees", "t-shirts", "essentials", "ecom", "online shopping"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Ecom",
    locale: "en_IN",
    title: "Ecom | T-Shirts Made for Every Day",
    description:
      "Clean cotton tees for everyday wear. Classic crew, oversized graphics, and easy returns. Free shipping above ₹999.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecom | T-Shirts Made for Every Day",
    description: "Clean cotton tees for everyday wear. Free shipping above ₹999.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2874f0",
};

async function loadNavigation(): Promise<NavigationSummary> {
  let navigation: NavigationSummary;
  const navFetch = { cache: "no-store" as const };

  try {
    navigation = await apiFetch<NavigationSummary>("/navigation", navFetch);
  } catch {
    navigation = FALLBACK_NAV;
  }

  // CMS-authored menus (when published) take precedence over the legacy
  // `/navigation` response and the hardcoded fallback above, per the "fully
  // operational CMS" requirement — but either falls straight back to
  // `navigation` as computed above when the corresponding menu is missing.
  const [mainNav, footerNav] = await Promise.allSettled([
    apiFetch<MenuSummary>(`/cms/menus/${MAIN_NAV_MENU_CODE}`, navFetch),
    apiFetch<MenuSummary>(`/cms/menus/${FOOTER_NAV_MENU_CODE}`, navFetch),
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
    <html lang="en" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow"
        >
          Skip to content
        </a>
        <JsonLd data={[jsonLdOrganization(siteOrigin()), jsonLdWebSite(siteOrigin())]} />
        <AppProviders>
          <AnalyticsPageView />
          <div className="flex min-h-screen flex-col">
            <SiteHeader navigation={navigation} />
            <main id="main-content" className="flex-1" tabIndex={-1}>
              {children}
            </main>
            <SiteFooter navigation={navigation} />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
