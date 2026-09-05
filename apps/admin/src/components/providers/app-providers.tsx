"use client";

import { ProductCardImageProvider } from "@ecom/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Image from "next/image";
import { useCallback, useState, type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message === "Unauthorized") return false;
              return failureCount < 1;
            },
          },
        },
      }),
  );

  const renderProductImage = useCallback(
    ({ src, alt, className }: { src: string; alt: string; className: string }) => (
      <Image src={src} alt={alt} fill sizes="(max-width: 768px) 50vw, 200px" className={className} />
    ),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ProductCardImageProvider renderer={renderProductImage}>{children}</ProductCardImageProvider>
    </QueryClientProvider>
  );
}
