"use client";

import type { DeliveryEstimate, PdpProduct, ProductReview } from "@ecom/types";
import { PriceDisplay, ProductCard } from "@ecom/ui";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, getToken } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { getSessionId } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface PdpViewProps {
  product: PdpProduct;
}

function getOptionMap(variant: PdpProduct["variants"][number]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const opt of variant.options) {
    map[opt.attributeKey] = opt.valueSlug;
  }
  return map;
}

export function PdpView({ product }: PdpViewProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState<DeliveryEstimate | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const images = product.media.length > 0 ? product.media : product.primaryImage ? [product.primaryImage] : [];

  const attributeGroups = useMemo(() => {
    const groups = new Map<string, { name: string; values: Set<string> }>();
    for (const variant of product.variants) {
      for (const opt of variant.options) {
        const group = groups.get(opt.attributeKey) ?? { name: opt.attributeName, values: new Set<string>() };
        group.values.add(opt.valueSlug);
        groups.set(opt.attributeKey, group);
      }
    }
    return [...groups.entries()].map(([key, group]) => ({
      key,
      name: group.name,
      values: [...group.values],
    }));
  }, [product.variants]);

  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const group of attributeGroups) {
      defaults[group.key] = group.values[0] ?? "";
    }
    setSelectedOptions(defaults);
  }, [attributeGroups]);

  const selectedVariant = useMemo(() => {
    return product.variants.find((variant) => {
      if (!variant.isActive) return false;
      const map = getOptionMap(variant);
      return Object.entries(selectedOptions).every(([key, slug]) => map[key] === slug);
    });
  }, [product.variants, selectedOptions]);

  const displayPrice = selectedVariant?.price ?? product.basePrice;
  const displayCompare = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const fabricHighlight = product.highlights.find((h) => h.label === "Fabric")?.value;
  const selectedSizeGuideRow = SIZE_GUIDE_ROWS.find(
    (row) => row.size.toLowerCase() === selectedOptions.size,
  );

  const trackView = useCallback(() => {
    void fetch(`${API_URL}/recently-viewed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({ productSlug: product.slug, sessionId: getSessionId() }),
    });
  }, [product.slug]);

  useEffect(() => {
    trackView();
    fetch(`${API_URL}/products/${product.slug}/reviews?pageSize=5`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setReviews(body.data.items);
      });
    fetch(`${API_URL}/wishlist?sessionId=${getSessionId()}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setWishlisted(body.data.some((item: { productSlug: string }) => item.productSlug === product.slug));
        }
      });
  }, [product.slug, trackView]);

  async function checkDelivery() {
    setDeliveryError(null);
    try {
      const result = await apiFetch<DeliveryEstimate>("/delivery/estimate", {
        method: "POST",
        body: JSON.stringify({ pincode, productSlug: product.slug }),
      });
      setDelivery(result);
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Could not check delivery");
    }
  }

  async function toggleWishlist() {
    if (wishlisted) return;
    await fetch(`${API_URL}/wishlist/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({
        productSlug: product.slug,
        variantSku: selectedVariant?.sku,
        sessionId: getSessionId(),
      }),
    });
    setWishlisted(true);
  }

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setAddingToCart(true);
    try {
      await addToCart(product.slug, selectedVariant.sku, quantity);
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28">
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span className="px-1.5 text-neutral-300">›</span>
        <Link href="/men" className="hover:underline">
          Shop
        </Link>
        <span className="px-1.5 text-neutral-300">›</span>
        <span className="text-neutral-700 dark:text-neutral-300">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex gap-3">
          <div className="hidden flex-col gap-2 sm:flex">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`h-16 w-16 overflow-hidden rounded border ${activeImage === i ? "border-brand-700" : "border-neutral-200"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="aspect-square flex-1 overflow-hidden rounded-lg bg-neutral-100">
            {images[activeImage] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[activeImage].url}
                alt={images[activeImage].altText ?? product.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-display font-bold sm:text-2xl">
                {product.brand ?? product.title}
              </h1>
              {product.brand && <p className="mt-1 text-sm text-neutral-500">{product.title}</p>}
            </div>
            {product.reviewSummary.totalReviews > 0 && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-800 dark:bg-neutral-950">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {product.reviewSummary.averageRating}
                </span>
                <span className="text-accent-500">★</span>
                <span className="text-neutral-300">|</span>
                <span className="text-neutral-500">{product.reviewSummary.totalReviews}</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <PriceDisplay price={displayPrice} compareAtPrice={displayCompare} />
            <p className="mt-1 text-xs text-neutral-500">Inclusive of all taxes</p>
            {fabricHighlight && (
              <span className="mt-2 inline-block rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
                {fabricHighlight}
              </span>
            )}
          </div>

          {!product.inStock && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Out of stock</p>
          )}

          {/* Color is hidden until real per-color imagery/variants are available — selection still
              defaults to the first color internally so variant matching keeps working. */}
          {attributeGroups
            .filter((group) => group.key !== "color")
            .map((group) => (
              <div key={group.key} className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Select {group.name}</p>
                  {group.key === "size" && (
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
                    >
                      Size Guide
                      <span aria-hidden="true">›</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.values.map((slug) => {
                    const available = product.variants.some((variant) => {
                      if (!variant.isActive) return false;
                      const map = getOptionMap(variant);
                      return map[group.key] === slug;
                    });
                    return (
                      <button
                        key={slug}
                        type="button"
                        disabled={!available}
                        onClick={() => setSelectedOptions((prev) => ({ ...prev, [group.key]: slug }))}
                        className={`min-w-[3rem] rounded border px-3 py-2 text-sm font-medium uppercase transition-colors ${
                          !available
                            ? "cursor-not-allowed border-neutral-200 text-neutral-300 line-through dark:border-neutral-800"
                            : selectedOptions[group.key] === slug
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-300 hover:border-neutral-500"
                        }`}
                      >
                        {slug}
                      </button>
                    );
                  })}
                </div>
                {group.key === "size" && selectedSizeGuideRow && (
                  <p className="mt-2 text-xs text-neutral-500">
                    Garment (in inches) — Chest: {selectedSizeGuideRow.chest} | Length: {selectedSizeGuideRow.length} | Sleeve: {selectedSizeGuideRow.sleeve}
                  </p>
                )}
              </div>
            ))}

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-9 w-9 rounded border border-neutral-300 text-lg hover:bg-neutral-50"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <button
                type="button"
                className="h-9 w-9 rounded border border-neutral-300 text-lg hover:bg-neutral-50"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={!product.inStock || !selectedVariant || addingToCart}
              onClick={() => void handleAddToCart()}
              className="flex-1 rounded-md bg-accent-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingToCart ? "Adding…" : "Add to Bag"}
            </button>
            <button
              type="button"
              onClick={() => void toggleWishlist()}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border transition-colors ${
                wishlisted
                  ? "border-accent-600 text-accent-600"
                  : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
              }`}
              aria-label={wishlisted ? "Saved to wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
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
          </div>

          <div className="mt-6 rounded-lg border border-neutral-200 p-4">
            <p className="text-sm font-semibold">Check for Delivery Details</p>
            <div className="mt-2 flex gap-2">
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter pincode"
                maxLength={6}
                className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void checkDelivery()}
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Check
              </button>
            </div>
            {delivery && <p className="mt-2 text-sm font-medium text-success-600">{delivery.message}</p>}
            {deliveryError && <p className="mt-2 text-sm text-red-600">{deliveryError}</p>}
            <p className="mt-2 text-xs text-neutral-500">Free shipping on orders above ₹999 · Cash on delivery available</p>
          </div>

          {product.highlights.length > 0 && (
            <div className="mt-6 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <p className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold dark:border-neutral-800">
                Key Highlights
              </p>
              <dl className="grid grid-cols-2 gap-x-4 px-4 py-2">
                {product.highlights.map((h) => (
                  <div key={h.label} className="flex justify-between gap-2 border-b border-neutral-100 py-2.5 text-sm last:border-b-0 dark:border-neutral-900">
                    <dt className="text-neutral-500">{h.label}</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">{h.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <section className="mt-2">
        {[
          { id: "details", title: "Product Details", content: product.description ?? "No description available." },
          { id: "shipping", title: "Shipping & Returns", content: "Free shipping above ₹999. 15-day easy returns on unused items." },
        ].map((section) => (
          <div key={section.id} className="border-b border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left font-semibold"
              onClick={() => setOpenAccordion(openAccordion === section.id ? null : section.id)}
            >
              {section.title}
              <span className="text-xl leading-none text-neutral-400">
                {openAccordion === section.id ? "−" : "+"}
              </span>
            </button>
            {openAccordion === section.id && <p className="pb-4 text-sm text-neutral-600 dark:text-neutral-400">{section.content}</p>}
          </div>
        ))}
      </section>

      <section className="mt-10 grid grid-cols-1 gap-4 border-y border-neutral-200 py-6 sm:grid-cols-3 dark:border-neutral-800">
        <TrustItem
          title="100% Genuine"
          description="Every product is quality-checked before dispatch"
          icon={<ShieldIcon />}
        />
        <TrustItem
          title="Secure Payments"
          description="Your payment information is always protected"
          icon={<LockIcon />}
        />
        <TrustItem
          title="Easy 15-Day Returns"
          description="Change of mind? Return unused items with tags"
          icon={<ReturnIcon />}
        />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Customer Reviews</h2>

        {product.reviewSummary.totalReviews > 0 && (
          <div className="mb-6 flex flex-col gap-6 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-800">
            <div className="text-center sm:w-32 sm:shrink-0">
              <p className="text-3xl font-display font-bold">{product.reviewSummary.averageRating}</p>
              <p className="text-accent-500">{"★".repeat(Math.round(product.reviewSummary.averageRating))}</p>
              <p className="text-xs text-neutral-500">{product.reviewSummary.totalReviews} ratings</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = product.reviewSummary.ratingBreakdown[String(star)] ?? 0;
                const pct = product.reviewSummary.totalReviews
                  ? Math.round((count / product.reviewSummary.totalReviews) * 100)
                  : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="w-8 shrink-0">{star} ★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-full bg-accent-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-neutral-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="font-medium text-accent-500">
                  {"★".repeat(review.rating)}
                  {review.isVerifiedPurchase && (
                    <span className="ml-2 text-xs font-normal text-success-600">Verified Purchase</span>
                  )}
                </p>
                {review.title && <p className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">{review.title}</p>}
                {review.body && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{review.body}</p>}
                <p className="mt-2 text-xs text-neutral-400">
                  {review.authorName} · {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {product.relatedProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {product.relatedProducts.map((related) => (
              <Link key={related.slug} href={`/products/${related.slug}`}>
                <ProductCard product={related} showStatus={false} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-3 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-7xl gap-2">
          <button
            type="button"
            disabled={!product.inStock || !selectedVariant || addingToCart}
            onClick={() => void handleAddToCart()}
            className="flex-1 rounded-md bg-accent-600 py-3 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {addingToCart ? "Adding…" : "Add to Bag"}
          </button>
          <button
            type="button"
            onClick={() => void handleAddToCart()}
            className="flex-1 rounded-md border border-neutral-900 py-3 text-sm font-bold uppercase tracking-wide text-neutral-900 dark:border-white dark:text-white"
          >
            Buy Now
          </button>
        </div>
      </div>

      {sizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-neutral-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Size Guide</h2>
              <button
                type="button"
                aria-label="Close size guide"
                onClick={() => setSizeGuideOpen(false)}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-neutral-500">All measurements are in inches. For the best fit, measure a similar garment you already own.</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-2 font-semibold">Size</th>
                  <th className="py-2 font-semibold">Chest</th>
                  <th className="py-2 font-semibold">Length</th>
                  <th className="py-2 font-semibold">Sleeve</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE_ROWS.map((row) => (
                  <tr key={row.size} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-2 font-medium">{row.size}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-400">{row.chest}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-400">{row.length}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-400">{row.sleeve}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const SIZE_GUIDE_ROWS = [
  { size: "S", chest: "36", length: "27", sleeve: "8.5" },
  { size: "M", chest: "38", length: "27.5", sleeve: "9" },
  { size: "L", chest: "40", length: "28", sleeve: "9.5" },
  { size: "XL", chest: "42", length: "28.5", sleeve: "10" },
  { size: "XXL", chest: "44", length: "29", sleeve: "10.5" },
];

function TrustItem({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 5 6v6c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5V6l-7-2.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 2 2 3.5-4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path strokeLinecap="round" d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h11a4.5 4.5 0 0 1 0 9H9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 4-3 3 3 3" />
    </svg>
  );
}
