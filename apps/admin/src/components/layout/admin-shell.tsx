"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/layout/admin-sidebar";

const BARE_PATHS = ["/login"];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PATHS.some((path) => pathname.startsWith(path));

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
