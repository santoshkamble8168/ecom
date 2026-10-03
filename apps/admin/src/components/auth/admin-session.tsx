"use client";

import type { Permission, UserProfile } from "@ecom/types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiClientError, apiFetch, ensureAccessToken } from "@/lib/api";

export type AdminSessionStatus =
  | "booting"
  | "loading"
  | "authenticated"
  | "anonymous"
  | "forbidden"
  | "error";

interface AdminSessionValue {
  status: AdminSessionStatus;
  profile: UserProfile | undefined;
  permissions: Set<string>;
  error?: string;
}

const AdminSessionContext = createContext<AdminSessionValue>({
  status: "booting",
  profile: undefined,
  permissions: new Set(),
});

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [tokenPresent, setTokenPresent] = useState<boolean | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureAccessToken()
      .then((token) => {
        if (!cancelled) setTokenPresent(Boolean(token));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBootstrapError(error instanceof Error ? error.message : "Unable to verify the admin session.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const query = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => apiFetch<UserProfile>("/me"),
    enabled: tokenPresent === true,
    retry: false,
    staleTime: 60_000,
  });

  const value = useMemo<AdminSessionValue>(() => {
    if (bootstrapError) {
      return { status: "error", profile: undefined, permissions: new Set(), error: bootstrapError };
    }
    if (tokenPresent === null) {
      return { status: "booting", profile: undefined, permissions: new Set() };
    }
    if (!tokenPresent) {
      return { status: "anonymous", profile: undefined, permissions: new Set() };
    }
    if (query.isSuccess && query.data) {
      if ((query.data.permissions ?? []).length === 0) {
        return { status: "forbidden", profile: query.data, permissions: new Set() };
      }
      return {
        status: "authenticated",
        profile: query.data,
        permissions: new Set(query.data.permissions ?? []),
      };
    }
    if (query.isError) {
      if (query.error instanceof ApiClientError && query.error.code === "UNAUTHORIZED") {
        return { status: "anonymous", profile: undefined, permissions: new Set() };
      }
      return {
        status: "error",
        profile: undefined,
        permissions: new Set(),
        error: query.error instanceof Error ? query.error.message : "Unable to verify the admin session.",
      };
    }
    return { status: "loading", profile: undefined, permissions: new Set() };
  }, [bootstrapError, query.data, query.error, query.isError, query.isSuccess, tokenPresent]);

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionValue {
  return useContext(AdminSessionContext);
}

export function useAdminPermissions(): Set<string> {
  return useContext(AdminSessionContext).permissions;
}

export function hasAnyPermission(granted: Set<string>, required: readonly Permission[]): boolean {
  return required.some((permission) => granted.has(permission));
}
