"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getToken } from "@/lib/api";

const PUBLIC_PATHS = ["/login"];

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    const token = getToken();

    if (!isPublic && !token) {
      router.replace("/login");
      return;
    }

    if (isPublic && token) {
      router.replace("/products");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-500">Loading…</div>;
  }

  return <>{children}</>;
}
