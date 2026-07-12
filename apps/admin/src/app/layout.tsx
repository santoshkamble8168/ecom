import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
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
          <div className="flex min-h-screen">
            <AdminSidebar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
