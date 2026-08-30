import type { ProductSummary } from "@ecom/types";
import type * as React from "react";

import { cn } from "../lib/cn";

import { ProductCard } from "./product-card";

export interface RecommendationRailProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  products: ProductSummary[];
  loading?: boolean;
  emptyLabel?: string;
  reason?: string;
  productHref?: (slug: string) => string;
  onProductClick?: (slug: string) => void;
}

export function RecommendationRail({
  title,
  products,
  loading = false,
  emptyLabel = "No recommendations right now.",
  reason,
  productHref = (slug) => `/products/${slug}`,
  onProductClick,
  className,
  ...props
}: RecommendationRailProps) {
  if (!loading && products.length === 0) {
    return (
      <section
        aria-label={title}
        className={cn("mx-auto max-w-7xl px-4 py-12", className)}
        {...props}
      >
        <h2 className="text-2xl font-display font-bold">{title}</h2>
        <p className="mt-2 text-sm text-neutral-500">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      className={cn("mx-auto max-w-7xl px-4 py-12", className)}
      {...props}
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-display font-bold">{title}</h2>
        {reason && <p className="hidden text-xs text-neutral-400 sm:block">{reason}</p>}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[3/4] animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.slug}>
              <a
                href={productHref(product.slug)}
                onClick={() => onProductClick?.(product.slug)}
              >
                <ProductCard product={product} showStatus={false} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
