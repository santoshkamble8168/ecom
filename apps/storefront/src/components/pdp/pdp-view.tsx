"use client";

import type { DeliveryEstimate, PdpProduct, ProductReview } from "@ecom/types";
import { PriceDisplay, ProductCard } from "@ecom/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, getToken } from "@/lib/auth";
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
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");

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

  function handleAddToCart() {
    alert("Add to cart — coming in Sprint 6");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28">
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <Link href="/men" className="hover:underline">
          Shop
        </Link>
        {" / "}
        <span>{product.title}</span>
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
          {product.brand && (
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{product.brand}</p>
          )}
          <h1 className="mt-1 text-2xl font-display font-bold">{product.title}</h1>

          {product.reviewSummary.totalReviews > 0 && (
            <p className="mt-2 text-sm text-neutral-600">
              ★ {product.reviewSummary.averageRating} ({product.reviewSummary.totalReviews} reviews)
            </p>
          )}

          <div className="mt-4">
            <PriceDisplay price={displayPrice} compareAtPrice={displayCompare} />
            <p className="mt-1 text-xs text-neutral-500">Inclusive of all taxes</p>
          </div>

          {!product.inStock && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Out of stock</p>
          )}

          {attributeGroups.map((group) => (
            <div key={group.key} className="mt-6">
              <p className="mb-2 text-sm font-semibold">{group.name}</p>
              <div className="flex flex-wrap gap-2">
                {group.values.map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setSelectedOptions((prev) => ({ ...prev, [group.key]: slug }))}
                    className={`rounded border px-3 py-2 text-sm uppercase ${
                      selectedOptions[group.key] === slug
                        ? "border-brand-700 bg-brand-50 text-brand-800"
                        : "border-neutral-300"
                    }`}
                  >
                    {slug}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Quantity</p>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded border px-3 py-1" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="w-8 text-center">{quantity}</span>
              <button type="button" className="rounded border px-3 py-1" onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={!product.inStock || !selectedVariant}
              onClick={handleAddToCart}
              className="flex-1 rounded-md bg-brand-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add to Bag
            </button>
            <button
              type="button"
              onClick={() => void toggleWishlist()}
              className="rounded-md border border-neutral-300 px-4 py-3 text-sm"
              aria-label="Add to wishlist"
            >
              {wishlisted ? "♥ Saved" : "♡ Wishlist"}
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-neutral-200 p-4">
            <p className="text-sm font-semibold">Check delivery</p>
            <div className="mt-2 flex gap-2">
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter pincode"
                maxLength={6}
                className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => void checkDelivery()} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
                Check
              </button>
            </div>
            {delivery && <p className="mt-2 text-sm text-green-700">{delivery.message}</p>}
            {deliveryError && <p className="mt-2 text-sm text-red-600">{deliveryError}</p>}
            <p className="mt-2 text-xs text-neutral-500">Free shipping on orders above ₹999</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {product.highlights.map((h) => (
              <div key={h.label} className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
                <p className="font-semibold">{h.label}</p>
                <p className="text-neutral-600 dark:text-neutral-400">{h.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-12">
        {[
          { id: "details", title: "Product Details", content: product.description ?? "No description available." },
          { id: "shipping", title: "Shipping & Returns", content: "Free shipping above ₹999. 15-day easy returns on unused items." },
        ].map((section) => (
          <div key={section.id} className="border-b border-neutral-200">
            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left font-semibold"
              onClick={() => setOpenAccordion(openAccordion === section.id ? null : section.id)}
            >
              {section.title}
              <span>{openAccordion === section.id ? "−" : "+"}</span>
            </button>
            {openAccordion === section.id && <p className="pb-4 text-sm text-neutral-600">{section.content}</p>}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-neutral-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-neutral-200 p-4">
                <p className="font-medium">
                  {"★".repeat(review.rating)}
                  {review.isVerifiedPurchase && (
                    <span className="ml-2 text-xs text-green-700">Verified Purchase</span>
                  )}
                </p>
                {review.title && <p className="mt-1 font-semibold">{review.title}</p>}
                {review.body && <p className="mt-1 text-sm text-neutral-600">{review.body}</p>}
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
                <ProductCard product={related} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-3 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-7xl gap-2">
          <button
            type="button"
            disabled={!product.inStock || !selectedVariant}
            onClick={handleAddToCart}
            className="flex-1 rounded-md bg-brand-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add to Bag
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 rounded-md border border-brand-700 py-3 text-sm font-semibold text-brand-700"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
