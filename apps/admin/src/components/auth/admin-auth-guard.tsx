"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAdminSession } from "@/components/auth/admin-session";
import { POST_LOGIN_PATH } from "@/components/layout/admin-nav";
import { AdminAppSkeleton, AdminLoginSkeleton } from "@/components/layout/admin-skeleton";

const PUBLIC_PATHS = ["/login"];

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAdminSession();
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (status === "booting" || status === "loading") return;

    if (!isPublic && status === "anonymous") {
      router.replace("/login");
      return;
    }

    if (isPublic && status === "authenticated") {
      router.replace(POST_LOGIN_PATH);
    }
  }, [isPublic, router, status]);

  if (status === "booting" || status === "loading") {
    return isPublic ? <AdminLoginSkeleton /> : <AdminAppSkeleton />;
  }

  if (!isPublic && status === "anonymous") {
    return <AdminAppSkeleton />;
  }

  if (isPublic && status === "authenticated") {
    return <AdminLoginSkeleton />;
  }

  return <>{children}</>;
}
