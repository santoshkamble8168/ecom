import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import type { ReactNode } from "react";

import { AdminAuthGuard } from "@/components/auth/admin-auth-guard";
import { AdminSessionProvider } from "@/components/auth/admin-session";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: {
    default: "Ecom Admin",
    template: "%s | Ecom Admin",
  },
  description: "Admin control center for the Ecom commerce platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <AppProviders>
          <AdminSessionProvider>
            <AdminAuthGuard>
              <AdminShell>{children}</AdminShell>
            </AdminAuthGuard>
          </AdminSessionProvider>
        </AppProviders>
      </body>
    </html>
  );
}
