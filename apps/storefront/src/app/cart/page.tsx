"use client";

import type { CartLineItem, CartSummary, DeliveryEstimate, PdpProduct } from "@ecom/types";
import { Button, Dialog } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { LoginModal } from "@/components/auth/login-modal";
import { PriceDetails } from "@/components/checkout/price-details";
import { CartStripBanner } from "@/components/cms/cart-strip-banner";
import { StorefrontImage } from "@/components/media/storefront-image";
import { StorefrontRecommendationRail } from "@/components/recommendations/recommendation-rail";
import { CommerceSkeleton } from "@/components/ui/commerce-skeleton";
import { getApiUrl } from "@/lib/api-url";
import { apiFetch, ensureAccessToken, hasSession } from "@/lib/auth";
import {
  addToCart,
  addToWishlist,
  applyCoupon,
  fetchCart,
  formatInr,
  moveToCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "@/lib/cart";

type SizeOption = { sku: string; label: string };

function sizeOptionsFromProduct(product: PdpProduct): SizeOption[] {
  const options = product.variants
    .filter((variant) => variant.isActive)
    .map((variant) => {
      const size = variant.options.find(
        (option) => /size/i.test(option.attributeKey) || /size/i.test(option.attributeName),
      );
      const label = size?.value ?? (variant.options.map((option) => option.value).join(" / ") || variant.sku);
      return { sku: variant.sku, label, variant };
    });

  const counts = new Map<string, number>();
  for (const option of options) {
    counts.set(option.label, (counts.get(option.label) ?? 0) + 1);
  }

  return options.map((option) => {
    if ((counts.get(option.label) ?? 0) < 2) {
      return { sku: option.sku, label: option.label };
    }
    const label = option.variant.options.map((entry) => entry.value).join(" / ") || option.label;
    return { sku: option.sku, label };
  });
}

const PINCODE_KEY = "ecom_cart_pincode";

function deliveryWindow(delivery: DeliveryEstimate): { prefix: string; dates: string } {
  const format = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };
  const from = format(delivery.estimatedDaysMin);
  const to = format(delivery.estimatedDaysMax);
  return from === to ? { prefix: "Delivery by", dates: to } : { prefix: "Delivery between", dates: `${from} - ${to}` };
}

function lineSavings(item: CartLineItem): number {
  if (item.product?.compareAtPrice == null) return 0;
  return Math.max(0, Number(item.product.compareAtPrice) - Number(item.unitPrice)) * item.quantity;
}

function MoveFromBagModal({
  items,
  onClose,
  onRemove,
  onMoveToWishlist,
  loading,
}: {
  items: CartLineItem[];
  onClose: () => void;
  onRemove: () => void;
  onMoveToWishlist: () => void;
  loading: boolean;
}) {
  const single = items.length === 1 ? items[0] : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={single ? "Move from Bag" : `Remove ${items.length} items`}
      description={
        single
          ? "Are you sure you want to move this item from bag?"
          : `Are you sure you want to remove ${items.length} items from bag?`
      }
      className="sm:max-w-sm"
    >
      {single && (
        <div className="mb-5 flex gap-3">
          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
            {single.product?.primaryImage && (
              <StorefrontImage
                src={single.product.primaryImage.url}
                alt={single.product.title}
                className="object-cover"
                sizes="64px"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">{single.product?.brand ?? "ECOM"}</p>
            <p className="truncate text-neutral-600">{single.product?.title ?? single.productSlug}</p>
            {single.variantLabel && <p className="mt-1 text-xs text-neutral-500">Size: {single.variantLabel}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        <button
          type="button"
          disabled={loading}
          onClick={onRemove}
          className="pt-4 text-sm font-bold uppercase tracking-wide text-neutral-600 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-300"
        >
          Remove
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onMoveToWishlist}
          className="pt-4 text-sm font-bold uppercase tracking-wide text-brand-600 hover:text-brand-700 disabled:opacity-50"
        >
          Move to Wishlist
        </button>
      </div>
    </Dialog>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pincode, setPincode] = useState("");
  const [pincodeDraft, setPincodeDraft] = useState("");
  const [pincodeOpen, setPincodeOpen] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryEstimate | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [removeTargets, setRemoveTargets] = useState<CartLineItem[] | null>(null);
  const [sizeItem, setSizeItem] = useState<CartLineItem | null>(null);
  const [qtyItem, setQtyItem] = useState<CartLineItem | null>(null);
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginToCheckout, setLoginToCheckout] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [sizesBySlug, setSizesBySlug] = useState<Record<string, SizeOption[]>>({});

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCart();
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
    setSignedIn(hasSession());
  }, [loadCart]);

  useEffect(() => {
    const openLogin = () => {
      setLoginToCheckout(true);
      setLoginOpen(true);
    };
    window.addEventListener("open-cart-login", openLogin);
    return () => window.removeEventListener("open-cart-login", openLogin);
  }, []);

  const sizeKey = cart?.items.map((item) => item.productSlug).join("|") ?? "";

  useEffect(() => {
    if (!sizeKey) return;
    let cancelled = false;
    const slugs = [...new Set(sizeKey.split("|"))];
    void Promise.all(
      slugs.map(async (slug) => {
        const response = await fetch(`${getApiUrl()}/products/${slug}`);
        const body = (await response.json()) as { success: boolean; data?: PdpProduct };
        if (!body.success || !body.data) return [slug, []] as const;
        return [slug, sizeOptionsFromProduct(body.data)] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setSizesBySlug(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [sizeKey]);

  async function handleProceed() {
    const token = await ensureAccessToken();
    if (token) {
      router.push("/checkout");
      return;
    }
    setLoginToCheckout(true);
    setLoginOpen(true);
  }

  async function runAction(action: () => Promise<CartSummary>): Promise<boolean> {
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const data = await action();
      setCart(data);
      window.dispatchEvent(new Event("cart-updated"));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function removeItems(items: CartLineItem[]) {
    const ok = await runAction(async () => {
      let next: CartSummary | null = null;
      for (const item of items) next = await removeCartItem(item.id);
      return next ?? fetchCart();
    });
    setRemoveTargets(null);
    if (ok) setNotice(`${items.length} item${items.length === 1 ? "" : "s"} removed from bag`);
  }

  async function moveItemsToWishlist(items: CartLineItem[]) {
    const ok = await runAction(async () => {
      let next: CartSummary | null = null;
      for (const item of items) {
        await addToWishlist(item.productSlug, item.variantSku);
        next = await removeCartItem(item.id);
      }
      return next ?? fetchCart();
    });
    setRemoveTargets(null);
    if (ok) setNotice(`${items.length} item${items.length === 1 ? "" : "s"} moved to wishlist`);
  }

  const checkDelivery = useCallback(async (code: string) => {
    setDeliveryError(null);
    try {
      const result = await apiFetch<DeliveryEstimate>("/delivery/estimate", {
        method: "POST",
        body: JSON.stringify({ pincode: code }),
      });
      setPincode(code);
      setDelivery(result);
      sessionStorage.setItem(PINCODE_KEY, code);
      setPincodeOpen(false);
    } catch (err) {
      setDelivery(null);
      setDeliveryError(err instanceof Error ? err.message : "Could not check delivery");
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(PINCODE_KEY);
    if (saved && /^\d{6}$/.test(saved)) {
      void checkDelivery(saved);
    }
  }, [checkDelivery]);

  async function changeSize(item: CartLineItem, sku: string) {
    if (sku === item.variantSku) return;
    await runAction(async () => {
      await addToCart(item.productSlug, sku, item.quantity);
      return removeCartItem(item.id);
    });
  }

  function openPincode() {
    setPincodeDraft(pincode);
    setDeliveryError(null);
    setPincodeOpen(true);
  }

  if (loading) {
    return <CommerceSkeleton />;
  }

  if (!cart || (cart.itemCount === 0 && cart.savedForLater.length === 0)) {
    return (
      <div>
        <CartStripBanner />
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="text-2xl font-display font-bold">Your bag is empty</h1>
          <p className="mt-2 text-neutral-500">Add items from the shop to get started.</p>
          <Link
            href="/men"
            className="mt-6 inline-block rounded-md bg-accent-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
          >
            Continue Shopping
          </Link>
        </div>
        <StorefrontRecommendationRail slot="cart_trending" title="Trending now" />
      </div>
    );
  }

  const selectedItems = cart.items.filter((item) => !deselected.has(item.id));
  const allSelected = cart.items.length > 0 && selectedItems.length === cart.items.length;
  const freeDelivery = Number(cart.amountToFreeShipping) <= 0;
  const eta = delivery ? deliveryWindow(delivery) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-28 lg:pb-10">
      <CartStripBanner />

      <div className="grid items-start lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="lg:border-r lg:border-neutral-200 lg:pr-4 lg:dark:border-neutral-800">
          <h1 className="sr-only">
            My Bag ({cart.itemCount} Item{cart.itemCount === 1 ? "" : "s"})
          </h1>

          {error && <p className="mb-4 rounded-sm bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>}
          {notice && (
            <p role="status" className="mb-4 rounded-sm bg-success-50 px-3 py-2 text-sm text-success-700">
              {notice}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 rounded-sm border border-accent-200 bg-accent-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-800 dark:text-neutral-100">
              {pincode ? (
                <>
                  Deliver to: <span className="font-bold">{pincode}</span>
                </>
              ) : (
                "Check delivery time & services"
              )}
            </p>
            <button
              type="button"
              onClick={openPincode}
              className="shrink-0 rounded-sm border border-brand-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-600 transition-colors hover:bg-brand-50 dark:hover:bg-neutral-800"
            >
              {pincode ? "Change Address" : "Enter Pin Code"}
            </button>
          </div>

          {cart.items.length > 0 && (
            <div className="mt-5 flex items-center justify-between gap-3 px-1">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-bold uppercase tracking-wide text-neutral-800 dark:text-neutral-100">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-brand-600"
                  checked={allSelected}
                  onChange={() =>
                    setDeselected(allSelected ? new Set(cart.items.map((item) => item.id)) : new Set())
                  }
                />
                {selectedItems.length}/{cart.items.length} Items Selected
              </label>
              <div className="flex items-center text-[11px] font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                <button
                  type="button"
                  className="px-3 py-1 uppercase hover:text-neutral-900 disabled:opacity-40 dark:hover:text-white"
                  disabled={actionLoading || selectedItems.length === 0}
                  onClick={() => setRemoveTargets(selectedItems)}
                >
                  Remove
                </button>
                <span className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" />
                <button
                  type="button"
                  className="px-3 py-1 uppercase leading-tight hover:text-neutral-900 disabled:opacity-40 dark:hover:text-white"
                  disabled={actionLoading || selectedItems.length === 0}
                  onClick={() => void moveItemsToWishlist(selectedItems)}
                >
                  Move to Wishlist
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {cart.items.map((item) => {
              const savings = lineSavings(item);
              const sizes = sizesBySlug[item.productSlug] ?? [];
              const sizeChoices =
                sizes.length > 0
                  ? sizes
                  : [{ sku: item.variantSku, label: item.variantLabel ?? item.variantSku }];
              const selected = !deselected.has(item.id);

              return (
                <article
                  key={item.id}
                  className="relative flex gap-3 rounded-sm border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
                    <Link href={`/products/${item.productSlug}`} className="absolute inset-0">
                      {item.product?.primaryImage && (
                        <StorefrontImage
                          src={item.product.primaryImage.url}
                          alt={item.product.title}
                          className="object-cover"
                          sizes="112px"
                        />
                      )}
                    </Link>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.product?.title ?? item.productSlug}`}
                      className="absolute left-1.5 top-1.5 h-4 w-4 cursor-pointer accent-brand-600"
                      checked={selected}
                      onChange={() =>
                        setDeselected((current) => {
                          const next = new Set(current);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1 pr-6 text-sm">
                    <p className="font-bold text-neutral-900 dark:text-neutral-100">{item.product?.brand ?? "ECOM"}</p>
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="mt-0.5 block truncate text-neutral-700 hover:underline dark:text-neutral-300"
                    >
                      {item.product?.title ?? item.productSlug}
                    </Link>
                    {item.product?.campaignBadge && (
                      <p className="mt-0.5 text-xs font-medium text-brand-700">{item.product.campaignBadge}</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-3">
                      <PillButton
                        label="Size"
                        value={sizeChoices.find((option) => option.sku === item.variantSku)?.label ?? item.variantLabel ?? "—"}
                        disabled={actionLoading}
                        onClick={() => setSizeItem(item)}
                      />
                      <PillButton
                        label="Qty"
                        value={String(item.quantity)}
                        disabled={actionLoading}
                        onClick={() => setQtyItem(item)}
                      />
                    </div>

                    <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{formatInr(item.lineTotal)}</span>
                      {item.product?.compareAtPrice && savings > 0 && (
                        <>
                          <span className="text-xs text-neutral-400 line-through">
                            {formatInr(Number(item.product.compareAtPrice) * item.quantity)}
                          </span>
                          <span className="text-xs font-semibold text-success-600">{formatInr(savings)} OFF</span>
                        </>
                      )}
                    </p>

                    {!item.available ? (
                      <p className="mt-2 text-xs font-medium text-danger-600">Currently unavailable</p>
                    ) : (
                      eta && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                          <CheckIcon />
                          <span>
                            {eta.prefix} <span className="font-bold">{eta.dates}</span>
                          </span>
                        </p>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label="Remove item"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center text-neutral-700 hover:text-neutral-950 disabled:opacity-50 dark:text-neutral-300 dark:hover:text-white"
                    disabled={actionLoading}
                    onClick={() => setRemoveTargets([item])}
                  >
                    <CloseIcon />
                  </button>
                </article>
              );
            })}
          </div>

          {!signedIn && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="flex items-center gap-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                <BagMiniIcon />
                Login to see items from your existing bag and wishlist.
              </p>
              <button
                type="button"
                className="shrink-0 text-xs font-bold uppercase tracking-wide text-brand-600 hover:text-brand-700"
                onClick={() => {
                  setLoginToCheckout(false);
                  setLoginOpen(true);
                }}
              >
                Login Now
              </button>
            </div>
          )}

          <Link
            href="/wishlist"
            className="mt-4 flex items-center justify-between rounded-sm border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            <span className="flex items-center gap-3">
              <HeartIcon />
              Add More From Wishlist
            </span>
            <ChevronRightIcon />
          </Link>

          {cart.savedForLater.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
                Saved for later ({cart.savedForLater.length})
              </h2>
              {cart.savedForLater.map((item) => (
                <div
                  key={item.id}
                  className="mb-2 flex items-center justify-between gap-3 rounded-sm border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{item.product?.title}</p>
                    <p className="text-xs text-neutral-500">{item.variantLabel}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => void runAction(() => moveToCart(item.id))}
                  >
                    <BagMiniIcon />
                    Move to bag
                  </Button>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="mt-6 lg:sticky lg:top-24 lg:mt-0 lg:pl-4">
          <section className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Coupons</h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                <TagIcon />
                {cart.appliedCoupons.length > 0
                  ? `${cart.appliedCoupons.length} Coupon${cart.appliedCoupons.length === 1 ? "" : "s"} applied`
                  : "Apply Coupons"}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-sm border border-brand-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-600 hover:bg-brand-50 dark:hover:bg-neutral-800"
                onClick={() => setCouponOpen(true)}
              >
                {cart.appliedCoupons.length > 0 ? "Edit" : "Apply"}
              </button>
            </div>
            {cart.appliedCoupons.length > 0 && (
              <ul className="mt-2 space-y-1 pl-7 text-xs">
                {cart.appliedCoupons.map((coupon) => (
                  <li key={coupon.code} className="flex items-center justify-between gap-2">
                    <span className="text-success-600">
                      <span className="font-semibold">{coupon.code}</span>
                      {Number(coupon.discountAmount) > 0 && ` — you save ${formatInr(coupon.discountAmount)}`}
                    </span>
                    <button
                      type="button"
                      className="font-medium text-danger-600 hover:underline"
                      disabled={actionLoading}
                      onClick={() => void runAction(() => removeCoupon(coupon.code))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!freeDelivery && (
              <p className="mt-2 pl-7 text-xs text-neutral-600 dark:text-neutral-400">
                Add items worth <span className="font-semibold">{formatInr(cart.amountToFreeShipping)}</span> more
                for free delivery
              </p>
            )}
          </section>

          <PriceDetails
            className="rounded-none border-0 bg-transparent px-0 pb-0 pt-4 dark:bg-transparent"
            itemCount={cart.itemCount}
            items={cart.items}
            subtotal={cart.subtotal}
            discount={cart.discount}
            shipping={cart.shipping}
            total={cart.total}
            onApplyCoupon={() => setCouponOpen(true)}
          >
            <Button
              className="mt-4 w-full rounded-sm bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
              disabled={actionLoading || cart.itemCount === 0}
              onClick={handleProceed}
            >
              Place Order
            </Button>
          </PriceDetails>
        </aside>
      </div>

      <StorefrontRecommendationRail
        slot="cart_frequently_bought"
        productSlug={cart.items[0]?.productSlug}
        title="You may also like"
      />
      <StorefrontRecommendationRail slot="cart_trending" title="Items you may have missed" />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-3 lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
        <Button
          className="w-full rounded-sm bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
          disabled={actionLoading || cart.itemCount === 0}
          onClick={handleProceed}
        >
          Place Order · {formatInr(cart.total)}
        </Button>
      </div>

      <Dialog
        open={pincodeOpen}
        onClose={() => setPincodeOpen(false)}
        title="Enter Delivery Pincode"
        className="sm:max-w-sm"
      >
        <form
          className="border-t border-neutral-100 pt-5 dark:border-neutral-800"
          onSubmit={(event) => {
            event.preventDefault();
            void checkDelivery(pincodeDraft.trim());
          }}
        >
          <div className="flex items-center rounded-sm border border-neutral-300 focus-within:border-neutral-500 dark:border-neutral-700">
            <label htmlFor="cart-pincode" className="sr-only">
              Pincode
            </label>
            <input
              id="cart-pincode"
              value={pincodeDraft}
              onChange={(event) => setPincodeDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter pincode"
              maxLength={6}
              inputMode="numeric"
              autoComplete="postal-code"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={pincodeDraft.trim().length !== 6}
              className="px-4 text-sm font-bold uppercase tracking-wide text-brand-600 hover:text-brand-700 disabled:text-neutral-400"
            >
              Check
            </button>
          </div>
          {deliveryError && <p className="mt-2 text-xs text-danger-600">{deliveryError}</p>}
          {delivery && pincode && !deliveryError && (
            <p className="mt-2 text-xs text-success-600">{delivery.message}</p>
          )}
        </form>
      </Dialog>

      <Dialog open={couponOpen} onClose={() => setCouponOpen(false)} title="Apply Coupon" className="sm:max-w-sm">
        <form
          className="border-t border-neutral-100 pt-5 dark:border-neutral-800"
          onSubmit={(event) => {
            event.preventDefault();
            if (!couponCode.trim()) return;
            void runAction(() => applyCoupon(couponCode)).then((ok) => {
              if (!ok) return;
              setCouponCode("");
              setCouponOpen(false);
            });
          }}
        >
          <div className="flex items-center rounded-sm border border-neutral-300 focus-within:border-neutral-500 dark:border-neutral-700">
            <label htmlFor="cart-coupon" className="sr-only">
              Coupon code
            </label>
            <input
              id="cart-coupon"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={actionLoading || !couponCode.trim()}
              className="px-4 text-sm font-bold uppercase tracking-wide text-brand-600 hover:text-brand-700 disabled:text-neutral-400"
            >
              Check
            </button>
          </div>
          {error && couponOpen && <p className="mt-2 text-xs text-danger-600">{error}</p>}
        </form>
      </Dialog>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setLoginOpen(false);
          setSignedIn(true);
          if (loginToCheckout) {
            router.push("/checkout");
            return;
          }
          void loadCart();
          window.dispatchEvent(new Event("cart-updated"));
        }}
      />

      {sizeItem && (
        <SizeModal
          item={sizeItem}
          sizes={
            sizesBySlug[sizeItem.productSlug]?.length
              ? sizesBySlug[sizeItem.productSlug]!
              : [{ sku: sizeItem.variantSku, label: sizeItem.variantLabel ?? sizeItem.variantSku }]
          }
          loading={actionLoading}
          onClose={() => setSizeItem(null)}
          onDone={(sku) => {
            void changeSize(sizeItem, sku).then(() => setSizeItem(null));
          }}
        />
      )}

      {qtyItem && (
        <QuantityModal
          quantity={qtyItem.quantity}
          loading={actionLoading}
          onClose={() => setQtyItem(null)}
          onDone={(quantity) => {
            if (quantity === qtyItem.quantity) {
              setQtyItem(null);
              return;
            }
            void runAction(() => updateCartItem(qtyItem.id, quantity)).then(() => setQtyItem(null));
          }}
        />
      )}

      {removeTargets && (
        <MoveFromBagModal
          items={removeTargets}
          loading={actionLoading}
          onClose={() => setRemoveTargets(null)}
          onRemove={() => void removeItems(removeTargets)}
          onMoveToWishlist={() => void moveItemsToWishlist(removeTargets)}
        />
      )}
    </div>
  );
}

function PillButton({
  label,
  value,
  disabled,
  onClick,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-sm bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-900 hover:bg-neutral-200 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
    >
      {label}: {value}
      <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" aria-hidden="true">
        <path d="M0 0h10L5 6z" fill="currentColor" />
      </svg>
    </button>
  );
}

const CHIP_BASE =
  "flex h-12 min-w-12 items-center justify-center rounded-full border px-3 text-sm font-bold transition-colors disabled:opacity-50";
const CHIP_IDLE =
  "border-neutral-400 text-neutral-900 hover:border-neutral-700 dark:border-neutral-600 dark:text-neutral-100";
const CHIP_ACTIVE = "border-brand-600 text-brand-600";

function DoneButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-6 w-full rounded-sm bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600 disabled:opacity-50"
    >
      Done
    </button>
  );
}

function SizeModal({
  item,
  sizes,
  loading,
  onClose,
  onDone,
}: {
  item: CartLineItem;
  sizes: SizeOption[];
  loading: boolean;
  onClose: () => void;
  onDone: (sku: string) => void;
}) {
  const [selected, setSelected] = useState(item.variantSku);
  const compareAt = item.product?.compareAtPrice != null ? Number(item.product.compareAtPrice) : null;
  const unitSavings = compareAt != null ? Math.max(0, compareAt - Number(item.unitPrice)) : 0;

  return (
    <Dialog open onClose={onClose} title="Select Size" hideTitle className="sm:max-w-md">
      <div className="-mt-8 flex gap-4 border-b border-neutral-200 pb-4 pr-10 dark:border-neutral-800">
        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
          {item.product?.primaryImage && (
            <StorefrontImage
              src={item.product.primaryImage.url}
              alt={item.product.title}
              className="object-cover"
              sizes="64px"
            />
          )}
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-bold text-neutral-900 dark:text-neutral-100">{item.product?.brand ?? "ECOM"}</p>
          <p className="mt-0.5 truncate text-neutral-700 dark:text-neutral-300">
            {item.product?.title ?? item.productSlug}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold">{formatInr(item.unitPrice)}</span>
            {compareAt != null && unitSavings > 0 && (
              <>
                <span className="text-xs text-neutral-400 line-through">{formatInr(compareAt)}</span>
                <span className="text-xs font-semibold text-success-600">{formatInr(unitSavings)} OFF</span>
              </>
            )}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm font-bold text-neutral-900 dark:text-neutral-100">Select Size</p>
      <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label="Size">
        {sizes.map((size) => {
          const active = size.sku === selected;
          return (
            <button
              key={size.sku}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
              onClick={() => setSelected(size.sku)}
            >
              {size.label}
            </button>
          );
        })}
      </div>

      <DoneButton
        disabled={loading}
        onClick={() => (selected === item.variantSku ? onClose() : onDone(selected))}
      />
    </Dialog>
  );
}

function QuantityModal({
  quantity,
  loading,
  onClose,
  onDone,
}: {
  quantity: number;
  loading: boolean;
  onClose: () => void;
  onDone: (quantity: number) => void;
}) {
  const [selected, setSelected] = useState(quantity);

  return (
    <Dialog open onClose={onClose} title="Select Quantity" className="sm:max-w-sm">
      <div
        className="grid grid-cols-5 justify-items-center gap-3 border-t border-neutral-200 pt-5 dark:border-neutral-800"
        role="radiogroup"
        aria-label="Quantity"
      >
        {Array.from({ length: 10 }, (_, index) => index + 1).map((qty) => {
          const active = qty === selected;
          return (
            <button
              key={qty}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${CHIP_BASE} w-12 px-0 ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
              onClick={() => setSelected(qty)}
            >
              {qty}
            </button>
          );
        })}
      </div>

      <DoneButton disabled={loading} onClick={() => onDone(selected)} />
    </Dialog>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-success-600" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8 5 5 5-5 5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12V5h7l9 9-7 7-9-9Z" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    </svg>
  );
}

function BagMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h12l-1 12H7L6 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a3 3 0 1 1 6 0v2" />
    </svg>
  );
}
