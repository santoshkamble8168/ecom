import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminAuthGuard } from "@/components/auth/admin-auth-guard";
import { AdminShell } from "@/components/layout/admin-shell";
import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ecom Admin",
    template: "%s | Ecom Admin",
  },
  description: "Admin control center for the Ecom commerce platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AdminAuthGuard>
            <AdminShell>{children}</AdminShell>
          </AdminAuthGuard>
        </AppProviders>
      </body>
    </html>
  );
}
