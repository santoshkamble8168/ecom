import type { ProductStatus, ProductSummary } from "@ecom/types";
import { Card } from "./card";
import { cn } from "../lib/cn";

export interface ProductCardProps {
  product: ProductSummary;
  className?: string;
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

export function ProductCard({ product, className }: ProductCardProps) {
  const discount = discountPercent(product.basePrice, product.compareAtPrice);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="aspect-square bg-neutral-100 dark:bg-neutral-800">
        {product.primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImage.url}
            alt={product.primaryImage.altText ?? product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            {product.brand && (
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {product.brand}
              </p>
            )}
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {product.title}
            </h3>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_COLORS[product.status],
            )}
          >
            {STATUS_LABELS[product.status]}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {formatPrice(product.basePrice)}
          </span>
          {product.compareAtPrice && (
            <span className="text-sm text-neutral-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
          {discount && (
            <span className="text-xs font-semibold text-green-600">{discount}% OFF</span>
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
