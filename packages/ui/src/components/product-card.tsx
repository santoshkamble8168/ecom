import type { ProductStatus, ProductSummary } from "@ecom/types";
import type * as React from "react";

import { cn } from "../lib/cn";

import { Card } from "./card";

export interface ProductCardProps {
  product: ProductSummary;
  className?: string;
  /** Show the catalog workflow status pill (Draft/Review/Published). Defaults
   * to true for backward compatibility with admin catalog views — storefront
   * consumers should pass `false` since shoppers never see draft/review state. */
  showStatus?: boolean;
  /** Renders a heart toggle in the top-right corner of the image for
   * wishlist quick-add without leaving the grid. Omit to hide the control. */
  wishlisted?: boolean;
  onToggleWishlist?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  review: "In Review",
  published: "Published",
  archived: "Archived",
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  review: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-neutral-200 text-neutral-500",
};

function formatPrice(price: string | null): string {
  if (!price) return "—";
  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function discountPercent(base: string | null, compare: string | null): number | null {
  if (!base || !compare) return null;
  const b = Number(base);
  const c = Number(compare);
  if (c <= b) return null;
  return Math.round(((c - b) / c) * 100);
}

export function ProductCard({
  product,
  className,
  showStatus = true,
  wishlisted,
  onToggleWishlist,
}: ProductCardProps) {
  const discount = discountPercent(product.basePrice, product.compareAtPrice);

  return (
    <Card className={cn("group overflow-hidden border-neutral-100 shadow-none", className)}>
      <div className="relative aspect-[3/4] bg-neutral-100 dark:bg-neutral-800">
        {product.primaryImage ? (
          <img
            src={product.primaryImage.url}
            alt={product.primaryImage.altText ?? product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            No image
          </div>
        )}
        {showStatus && (
          <span
            className={cn(
              "absolute left-2 top-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_COLORS[product.status],
            )}
          >
            {STATUS_LABELS[product.status]}
          </span>
        )}
        {onToggleWishlist && (
          <button
            type="button"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wishlisted}
            onClick={onToggleWishlist}
            className={cn(
              "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:text-accent-600 dark:bg-neutral-900/90",
              wishlisted ? "text-accent-600" : "text-neutral-700",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill={wishlisted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.5s-7.5-4.6-9.9-9A5.5 5.5 0 0 1 12 5.6a5.5 5.5 0 0 1 9.9 5.9c-2.4 4.4-9.9 9-9.9 9Z"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="p-3">
        {product.brand && (
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {product.brand}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {product.title}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {formatPrice(product.basePrice)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-neutral-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
          {discount && (
            <span className="text-xs font-semibold text-success-600">{discount}% off</span>
          )}
        </div>
      </div>
    </Card>
  );
}

export function PriceDisplay({
  price,
  compareAtPrice,
  className,
}: {
  price: string | null;
  compareAtPrice?: string | null;
  className?: string;
}) {
  const discount = discountPercent(price, compareAtPrice ?? null);

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="text-lg font-bold">{formatPrice(price)}</span>
      {compareAtPrice && (
        <span className="text-sm text-neutral-400 line-through">
          {formatPrice(compareAtPrice)}
        </span>
      )}
      {discount && (
        <span className="text-sm font-semibold text-green-600">{discount}% OFF</span>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
