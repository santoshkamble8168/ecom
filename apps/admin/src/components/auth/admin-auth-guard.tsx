"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAdminSession } from "@/components/auth/admin-session";
import { POST_LOGIN_PATH } from "@/components/layout/admin-nav";
import { AdminAppSkeleton, AdminLoginSkeleton } from "@/components/layout/admin-skeleton";
import { logout } from "@/lib/api";

const PUBLIC_PATHS = ["/login"];

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, error } = useAdminSession();
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (status === "booting" || status === "loading") return;

    if (!isPublic && (status === "anonymous" || status === "forbidden")) {
      router.replace(status === "forbidden" ? "/login?reason=forbidden" : "/login");
      return;
    }

    if (isPublic && status === "authenticated") {
      router.replace(POST_LOGIN_PATH);
    }
  }, [isPublic, router, status]);

  if (status === "booting" || status === "loading") {
    return isPublic ? <AdminLoginSkeleton /> : <AdminAppSkeleton />;
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to verify your session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-600">
              {error ?? "The admin API is temporarily unavailable. Your session has not been cleared."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => window.location.reload()}>
                Try again
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void logout().finally(() => window.location.replace("/login"));
                }}
              >
                Sign in again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isPublic && (status === "anonymous" || status === "forbidden")) {
    return <AdminAppSkeleton />;
  }

  if (isPublic && status === "authenticated") {
    return <AdminLoginSkeleton />;
  }

  return <>{children}</>;
}
