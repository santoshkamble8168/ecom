"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureAnalytics } from "@ecom/analytics";
import { useState, type ReactNode } from "react";

import { getToken } from "@/lib/auth";

configureAnalytics({
  endpoint: "/api/v1/analytics/events",
  getAuthToken: getToken,
  debug: process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true",
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
