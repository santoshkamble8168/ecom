"use client";

import type { Permission, UserProfile } from "@ecom/types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiFetch, getToken } from "@/lib/api";

export type AdminSessionStatus = "booting" | "loading" | "authenticated" | "anonymous";

interface AdminSessionValue {
  status: AdminSessionStatus;
  profile: UserProfile | undefined;
  permissions: Set<string>;
}

const AdminSessionContext = createContext<AdminSessionValue>({
  status: "booting",
  profile: undefined,
  permissions: new Set(),
});

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [tokenPresent, setTokenPresent] = useState<boolean | null>(null);

  useEffect(() => {
    setTokenPresent(Boolean(getToken()));
  }, []);

  const query = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => apiFetch<UserProfile>("/me"),
    enabled: tokenPresent === true,
    retry: false,
    staleTime: 60_000,
  });

  const value = useMemo<AdminSessionValue>(() => {
    if (tokenPresent === null) {
      return { status: "booting", profile: undefined, permissions: new Set() };
    }
    if (!tokenPresent) {
      return { status: "anonymous", profile: undefined, permissions: new Set() };
    }
    if (query.isSuccess && query.data) {
      return {
        status: "authenticated",
        profile: query.data,
        permissions: new Set(query.data.permissions ?? []),
      };
    }
    if (query.isError) {
      return { status: "anonymous", profile: undefined, permissions: new Set() };
    }
    return { status: "loading", profile: undefined, permissions: new Set() };
  }, [query.data, query.isError, query.isSuccess, tokenPresent]);

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
