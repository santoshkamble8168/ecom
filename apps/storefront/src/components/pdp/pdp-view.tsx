"use client";

import type { DeliveryEstimate, PdpProduct, ProductReview } from "@ecom/types";
import { PriceDisplay, ProductCard } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

/* ────────────────────────────────────────────────────────────────────
   SVG Icons
──────────────────────────────────────────────────────────────────── */
function BagIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SpinnerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function PartyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.8 11.3 2 22l10.7-3.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01M9.5 6 8 2M19.5 13l2-4M12.5 21l-1-3" />
      <path strokeLinecap="round" d="m8 14 6-6" />
    </svg>
  );
}

function TruckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 3h15v13H1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8h4l3 3v5h-7V8Z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Toast notification (bottom of screen)
──────────────────────────────────────────────────────────────────── */
interface ToastProps {
  show: boolean;
  message: string;
  productTitle: string;
  onGoToBag: () => void;
}

function Toast({ show, message, productTitle, onGoToBag }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 transition-all duration-500 ${
        show ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
      }`}
      style={{ minWidth: "340px", maxWidth: "92vw" }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3.5 text-white shadow-2xl dark:bg-white dark:text-neutral-900">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white animate-pop">
          <CheckCircleIcon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{message}</p>
          <p className="text-xs opacity-60 truncate">{productTitle}</p>
        </div>
        <button
          type="button"
          onClick={onGoToBag}
          className="flex items-center gap-1.5 rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-white whitespace-nowrap transition-all hover:bg-green-600 active:scale-95"
        >
          GO TO BAG <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Celebration Banner (Bewakoof-style inline success bar)
──────────────────────────────────────────────────────────────────── */
interface CelebrationBannerProps {
  show: boolean;
  savings: number;
  freeShipping: boolean;
}

function CelebrationBanner({ show, savings, freeShipping }: CelebrationBannerProps) {
  if (!show) return null;

  return (
    <div className="mt-4 animate-fade-in overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-3.5 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 animate-pop">
          {freeShipping ? <TruckIcon className="h-5 w-5" /> : <PartyIcon className="h-5 w-5" />}
        </span>
        <div>
          <p className="text-sm font-bold">
            {freeShipping ? "Yay! FREE shipping unlocked" : "Added to your bag! 🎉"}
          </p>
          {savings > 0 && (
            <p className="text-xs opacity-80">
              You are saving ₹{savings.toLocaleString("en-IN")} on this item
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Size Picker Modal (Bewakoof-style "Choose your perfect fit!")
──────────────────────────────────────────────────────────────────── */
interface SizePickerModalProps {
  open: boolean;
  onClose: () => void;
  attributeGroups: { key: string; name: string; values: string[] }[];
  selectedOptions: Record<string, string>;
  onSelect: (key: string, slug: string) => void;
  product: PdpProduct;
  onAddToBag: () => void;
  addingToCart: boolean;
}

function SizePickerModal({
  open,
  onClose,
  attributeGroups,
  selectedOptions,
  onSelect,
  product,
  onAddToBag,
  addingToCart,
}: SizePickerModalProps) {
  const sizeGroup = attributeGroups.find((g) => g.key === "size");
  const hasSizeSelected = !!(sizeGroup && selectedOptions["size"]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* sheet */}
      <div className="relative w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-950 p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Choose your perfect fit!</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {attributeGroups
          .filter((g) => g.key !== "color")
          .map((group) => (
            <div key={group.key} className="mb-5">
              <p className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Select {group.name}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {group.values.map((slug) => {
                  const available = product.variants.some((v) => {
                    if (!v.isActive) return false;
                    return getOptionMap(v)[group.key] === slug;
                  });
                  const isSelected = selectedOptions[group.key] === slug;
                  return (
                    <button
                      key={slug}
                      type="button"
                      disabled={!available}
                      onClick={() => onSelect(group.key, slug)}
                      className={`min-w-[3rem] rounded-lg border px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-all duration-200 ${
                        !available
                          ? "cursor-not-allowed border-neutral-200 text-neutral-300 line-through dark:border-neutral-800"
                          : isSelected
                            ? "border-accent-600 bg-accent-600 text-white shadow-md scale-105"
                            : "border-neutral-300 hover:border-neutral-500 hover:scale-105"
                      }`}
                    >
                      {slug}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        <button
          type="button"
          disabled={!hasSizeSelected || addingToCart}
          onClick={onAddToBag}
          className={`mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl py-4 text-sm font-bold uppercase tracking-widest transition-all duration-300 disabled:cursor-not-allowed ${
            hasSizeSelected
              ? "bg-accent-500 text-white hover:bg-accent-600 active:scale-[0.98] shadow-md"
              : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
          }`}
        >
          {addingToCart ? (
            <>
              <SpinnerIcon className="h-5 w-5" />
              Adding…
            </>
          ) : (
            <>
              <BagIcon className="h-5 w-5" />
              Add to Bag
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Main PDP View
──────────────────────────────────────────────────────────────────── */
export function PdpView({ product }: PdpViewProps) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState<DeliveryEstimate | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizePickerOpen, setSizePickerOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // No default size – user must explicitly select.
  // Auto-select non-size attributes (e.g. color) so variant matching works.
  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const group of attributeGroups) {
      if (group.key !== "size") {
        defaults[group.key] = group.values[0] ?? "";
      }
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

  const sizeSelected = !!selectedOptions["size"];

  const displayPrice = selectedVariant?.price ?? product.basePrice;
  const displayCompare = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const savings = displayCompare && displayPrice
    ? Math.max(0, Number(displayCompare) - Number(displayPrice))
    : 0;
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

  // Called when user clicks the main CTA
  function handleCtaClick() {
    // If already added, navigate to cart
    if (addedToCart) {
      router.push("/cart");
      return;
    }
    // If no size selected, open the size picker modal
    if (!sizeSelected) {
      setSizePickerOpen(true);
      return;
    }
    if (!selectedVariant) return;
    void performAddToCart();
  }

  // Called from the size picker modal's button
  function handleModalAddToBag() {
    if (!selectedVariant) return;
    void performAddToCart();
  }

  async function performAddToCart() {
    if (!selectedVariant) return;
    setAddingToCart(true);
    try {
      await addToCart(product.slug, selectedVariant.sku, quantity);
      window.dispatchEvent(new Event("cart-updated"));

      // Close modal immediately
      setSizePickerOpen(false);

      // Permanently set "Go to Bag" state
      setAddedToCart(true);

      // Show celebration banner
      setShowCelebration(true);

      // Show bottom toast
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
      }, 4500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }

  function handleSelectSize(key: string, slug: string) {
    setSelectedOptions((prev) => ({ ...prev, [key]: slug }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28">
      {/* Breadcrumb */}
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
        {/* ─── Image gallery ─── */}
        <div className="flex gap-3">
          <div className="hidden flex-col gap-2 sm:flex">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`h-16 w-16 overflow-hidden rounded border transition-colors ${activeImage === i ? "border-brand-700 ring-1 ring-brand-700" : "border-neutral-200"}`}
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

        {/* ─── Product details ─── */}
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

          {/* Color is hidden until real per-color imagery/variants are available */}
          {attributeGroups
            .filter((group) => group.key !== "color")
            .map((group) => (
              <div key={group.key} className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Select {group.name}
                    {group.key === "size" && !sizeSelected && (
                      <span className="ml-2 text-xs font-normal text-neutral-400">(required)</span>
                    )}
                  </p>
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
                        className={`min-w-[3rem] rounded border px-3 py-2 text-sm font-medium uppercase transition-all duration-150 ${
                          !available
                            ? "cursor-not-allowed border-neutral-200 text-neutral-300 line-through dark:border-neutral-800"
                            : selectedOptions[group.key] === slug
                              ? "border-neutral-900 bg-neutral-900 text-white scale-105 shadow"
                              : "border-neutral-300 hover:border-neutral-500 hover:scale-105"
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

          {/* Celebration banner — shown after add-to-cart success */}
          <CelebrationBanner show={showCelebration} savings={savings} freeShipping={Number(displayPrice) >= 999} />

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-9 w-9 rounded border border-neutral-300 text-lg hover:bg-neutral-50 transition-colors"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <button
                type="button"
                className="h-9 w-9 rounded border border-neutral-300 text-lg hover:bg-neutral-50 transition-colors"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* ─── Primary CTA: Add to Bag / Go to Bag ─── */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={!product.inStock || addingToCart}
              onClick={handleCtaClick}
              className={`relative flex-1 flex items-center justify-center gap-2.5 overflow-hidden rounded-md px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                addedToCart
                  ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                  : "bg-accent-600 hover:bg-accent-700"
              }`}
            >
              {addedToCart ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 animate-pop" />
                  Go to Bag
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              ) : addingToCart ? (
                <>
                  <SpinnerIcon className="h-5 w-5" />
                  Adding…
                </>
              ) : (
                <>
                  <BagIcon className="h-5 w-5" />
                  Add to Bag
                </>
              )}
              {/* Shimmer sweep on success */}
              {addedToCart && (
                <span className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void toggleWishlist()}
              className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                wishlisted
                  ? "border-accent-600 bg-accent-50 text-accent-600 scale-110"
                  : "border-neutral-300 text-neutral-700 hover:border-neutral-500 hover:scale-105"
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

          {/* Delivery details */}
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

          {/* Key highlights */}
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

      {/* Accordions */}
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

      {/* Trust badges */}
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

      {/* Reviews */}
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

      {/* Related products */}
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

      {/* ─── Mobile sticky footer ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-3 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-7xl gap-2">
          <button
            type="button"
            disabled={!product.inStock || addingToCart}
            onClick={handleCtaClick}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 disabled:opacity-50 ${
              addedToCart ? "bg-green-600" : "bg-accent-600"
            }`}
          >
            {addedToCart ? (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Go to Bag
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </>
            ) : addingToCart ? (
              <>
                <SpinnerIcon className="h-5 w-5" />
                Adding…
              </>
            ) : (
              <>
                <BagIcon className="h-5 w-5" />
                Add to Bag
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCtaClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-900 py-3 text-sm font-bold uppercase tracking-wide text-neutral-900 dark:border-white dark:text-white"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Size picker modal */}
      <SizePickerModal
        open={sizePickerOpen}
        onClose={() => setSizePickerOpen(false)}
        attributeGroups={attributeGroups}
        selectedOptions={selectedOptions}
        onSelect={handleSelectSize}
        product={product}
        onAddToBag={handleModalAddToBag}
        addingToCart={addingToCart}
      />

      {/* Bottom toast */}
      <Toast
        show={showToast}
        message="Added to your bag!"
        productTitle={product.title}
        onGoToBag={() => {
          setShowToast(false);
          router.push("/cart");
        }}
      />

      {/* Size guide modal */}
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

/* ────────────────────────────────────────────────────────────────────
   Static data & sub-components
──────────────────────────────────────────────────────────────────── */
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
