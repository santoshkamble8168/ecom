"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AdminMobileNav, AdminSidebar } from "@/components/layout/admin-sidebar";

const BARE_PATHS = ["/login"];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PATHS.some((path) => pathname.startsWith(path));

  if (isBare) {
    return <div id="main-content">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav />
        <main id="main-content" className="flex-1 p-4 md:p-8" tabIndex={-1}>
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
