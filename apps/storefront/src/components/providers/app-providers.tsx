"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureAnalytics } from "@ecom/analytics";
import { ProductCardImageProvider } from "@ecom/ui";
import Image from "next/image";
import { useCallback, useState, type ReactNode } from "react";

import { CookieConsentBanner } from "@/components/consent/cookie-consent-banner";
import { getToken } from "@/lib/auth";

configureAnalytics({
  endpoint: "/api/v1/analytics/events",
  getAuthToken: getToken,
  enabled: false,
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

  const renderProductImage = useCallback(
    ({ src, alt, className }: { src: string; alt: string; className: string }) => (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        quality={75}
        className={`${className} object-cover`}
      />
    ),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ProductCardImageProvider renderer={renderProductImage}>
        {children}
        <CookieConsentBanner />
      </ProductCardImageProvider>
    </QueryClientProvider>
  );
}
