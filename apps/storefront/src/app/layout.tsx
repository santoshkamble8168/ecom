import type { NavigationSummary } from "@ecom/types";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { apiFetch } from "@/lib/api";

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

export const metadata: Metadata = {
  title: {
    default: "Ecom Storefront",
    template: "%s | Ecom",
  },
  description: "Production-grade commerce storefront built with Next.js and NestJS.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let navigation: NavigationSummary;
  try {
    navigation = await apiFetch<NavigationSummary>("/navigation");
  } catch {
    navigation = FALLBACK_NAV;
  }

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
