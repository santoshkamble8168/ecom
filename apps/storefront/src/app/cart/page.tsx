"use client";

import type { CartLineItem, CartSummary, DeliveryEstimate, PdpProduct } from "@ecom/types";
import { Button, Dialog } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { LoginModal } from "@/components/auth/login-modal";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { PriceDetails } from "@/components/checkout/price-details";
import { CartStripBanner } from "@/components/cms/cart-strip-banner";
import { StorefrontImage } from "@/components/media/storefront-image";
import { StorefrontRecommendationRail } from "@/components/recommendations/recommendation-rail";
import { CommerceSkeleton } from "@/components/ui/commerce-skeleton";
import { getApiUrl } from "@/lib/api-url";
import { apiFetch, ensureAccessToken } from "@/lib/auth";
import {
  addToCart,
  applyCoupon,
  fetchCart,
  formatInr,
  moveToCart,
  removeCartItem,
  removeCoupon,
  saveForLater,
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

function arrivalLabel(delivery: DeliveryEstimate | null): { prefix: string; date: string } {
  const days = delivery?.estimatedDaysMax ?? 4;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return {
    prefix: "Get it by",
    date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
  };
}

function ClearFromBagModal({
  item,
  onClose,
  onRemove,
  onSaveForLater,
  loading,
}: {
  item: CartLineItem;
  onClose: () => void;
  onRemove: () => void;
  onSaveForLater: () => void;
  loading: boolean;
}) {
  const savings =
    item.product?.compareAtPrice != null
      ? Math.max(0, Number(item.product.compareAtPrice) - Number(item.unitPrice)) * item.quantity
      : 0;

  return (
    <Dialog open onClose={onClose} title="Clear From Bag" description="Are you sure you want to remove this item from bag?">
      <div className="mb-5 flex gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
          {item.product?.primaryImage && (
            <StorefrontImage
              src={item.product.primaryImage.url}
              alt={item.product.title}
              className="object-cover"
              sizes="80px"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.product?.title ?? item.productSlug}</p>
          {item.variantLabel && <p className="text-xs text-neutral-500">Size: {item.variantLabel}</p>}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold">{formatInr(item.unitPrice)}</span>
            {item.product?.compareAtPrice && (
              <span className="text-xs text-neutral-400 line-through">
                {formatInr(item.product.compareAtPrice)}
              </span>
            )}
          </div>
          {savings > 0 && (
            <p className="mt-0.5 text-xs font-medium text-success-600">You saved {formatInr(savings)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={onRemove}
          className="rounded-xl border border-neutral-300 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Remove
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onSaveForLater}
          className="rounded-xl bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 transition-colors hover:bg-accent-600 disabled:opacity-50"
        >
          Save for Later
        </button>
      </div>
    </Dialog>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 8 5 5 5-5" />
    </svg>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pincode, setPincode] = useState("");
  const [pincodeDraft, setPincodeDraft] = useState("");
  const [pincodeOpen, setPincodeOpen] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryEstimate | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [removeItem, setRemoveItem] = useState<CartLineItem | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
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
  }, [loadCart]);

  useEffect(() => {
    const openLogin = () => setLoginOpen(true);
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
    setLoginOpen(true);
  }

  async function runAction(action: () => Promise<CartSummary>) {
    setActionLoading(true);
    setError(null);
    try {
      const data = await action();
      setCart(data);
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
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

  const totalSavings =
    cart.items.reduce((sum, item) => {
      const compare = item.product?.compareAtPrice;
      if (!compare) return sum;
      const diff = Number(compare) - Number(item.unitPrice);
      return diff > 0 ? sum + diff * item.quantity : sum;
    }, 0) + Number(cart.discount);
  const freeDelivery = Number(cart.amountToFreeShipping) <= 0;
  const appliedOffer = cart.appliedCoupons[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-8">
      <CartStripBanner />
      <CheckoutSteps current="bag" />
      {error && <p className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h1 className="mb-4 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            My Bag ({cart.itemCount} Item{cart.itemCount === 1 ? "" : "s"})
          </h1>

          {totalSavings > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-success-50 px-4 py-2.5 text-sm font-medium text-success-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-600 text-[10px] font-bold text-white">
                %
              </span>
              You are saving {formatInr(totalSavings)} on this order
            </div>
          )}

          <div className="space-y-4">
            {cart.items.map((item) => {
              const lineSavings =
                item.product?.compareAtPrice != null
                  ? Math.max(0, Number(item.product.compareAtPrice) - Number(item.unitPrice)) * item.quantity
                  : 0;
              const sizes = sizesBySlug[item.productSlug] ?? [];
              const sizeChoices =
                sizes.length > 0
                  ? sizes
                  : [{ sku: item.variantSku, label: item.variantLabel ?? item.variantSku }];
              const arrival = arrivalLabel(delivery);
              const shopHref = item.product?.categorySlugs[0]
                ? `/categories/${item.product.categorySlugs[0]}`
                : "/men";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
                >
                  {item.product?.campaignBadge && (
                    <div className="flex items-start justify-between gap-3 bg-brand-50 px-4 py-3 text-sm dark:bg-neutral-900">
                      <div>
                        <p className="font-semibold text-brand-700">{item.product.campaignBadge}</p>
                        <p className="text-xs text-brand-600">Offer applicable on this item</p>
                      </div>
                      <Link href={shopHref} className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
                        Add Items
                      </Link>
                    </div>
                  )}

                  <div className="relative p-4">
                    <button
                      type="button"
                      aria-label="Remove item"
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900"
                      disabled={actionLoading}
                      onClick={() => setRemoveItem(item)}
                    >
                      ✕
                    </button>

                    <div className="flex gap-4 pr-8">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
                      >
                        {item.product?.primaryImage && (
                          <StorefrontImage
                            src={item.product.primaryImage.url}
                            alt={item.product.title}
                            className="object-cover"
                            sizes="96px"
                          />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{item.product?.brand ?? "ECOM"}</p>
                        <Link href={`/products/${item.productSlug}`} className="mt-0.5 block text-sm text-neutral-600 hover:underline">
                          {item.product?.title ?? item.productSlug}
                        </Link>
                        {item.product?.campaignBadge && (
                          <p className="mt-1 text-xs font-medium text-brand-700">{item.product.campaignBadge}</p>
                        )}
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-success-600">
                          <TruckIcon />
                          {arrival.prefix}{" "}
                          <span className="font-semibold">{arrival.date}</span>
                        </p>
                        {!item.available && <p className="mt-1 text-sm text-danger-600">Unavailable</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-bold">{formatInr(item.lineTotal)}</p>
                        {item.product?.compareAtPrice && (
                          <p className="text-xs text-neutral-400 line-through">
                            {formatInr(Number(item.product.compareAtPrice) * item.quantity)}
                          </p>
                        )}
                        {lineSavings > 0 && (
                          <p className="mt-0.5 text-xs font-medium text-success-600">You saved {formatInr(lineSavings)}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <span className="text-neutral-500">Size:</span>
                        <select
                          className="bg-transparent font-medium outline-none"
                          value={item.variantSku}
                          disabled={actionLoading || sizeChoices.length < 2}
                          onChange={(event) => void changeSize(item, event.target.value)}
                        >
                          {sizeChoices.map((option) => (
                            <option key={option.sku} value={option.sku}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <span className="text-neutral-500">Qty:</span>
                        <select
                          className="bg-transparent font-medium outline-none"
                          value={item.quantity}
                          disabled={actionLoading}
                          onChange={(event) =>
                            void runAction(() => updateCartItem(item.id, Number(event.target.value)))
                          }
                        >
                          {Array.from({ length: 10 }, (_, index) => index + 1).map((qty) => (
                            <option key={qty} value={qty}>
                              {qty}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-900"
                      disabled={actionLoading}
                      onClick={() => void runAction(() => saveForLater(item.id))}
                    >
                      <BookmarkIcon />
                      Save for later
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 border-x border-neutral-200 py-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                      disabled={actionLoading}
                      onClick={() => setRemoveItem(item)}
                    >
                      <TrashIcon />
                      Remove
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-brand-700 hover:bg-neutral-50 disabled:opacity-50 dark:hover:bg-neutral-900"
                      disabled={actionLoading || !item.available}
                      onClick={handleProceed}
                    >
                      <BoltIcon />
                      Buy this now
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {cart.savedForLater.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Saved for later ({cart.savedForLater.length})</h2>
              {cart.savedForLater.map((item) => (
                <div
                  key={item.id}
                  className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div>
                    <p className="font-medium">{item.product?.title}</p>
                    <p className="text-sm text-neutral-500">{item.variantLabel}</p>
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

        <aside className="space-y-3 lg:sticky lg:top-24">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl border border-accent-100 bg-accent-50 px-4 py-3 text-left text-sm font-medium text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            onClick={() => {
              setPincodeDraft(pincode);
              setDeliveryError(null);
              setPincodeOpen(true);
            }}
          >
            <PinIcon />
            <span className="flex-1">
              {pincode ? (
                <>
                  Delivering to: <span className="font-semibold">{pincode}</span>
                </>
              ) : (
                "Enter pincode for delivery estimate"
              )}
            </span>
            <ChevronIcon />
          </button>

          <Dialog
            open={pincodeOpen}
            onClose={() => setPincodeOpen(false)}
            title="Delivery pincode"
            description="Check when this order can reach you. You can update the pincode anytime."
          >
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void checkDelivery(pincodeDraft.trim());
              }}
            >
              <label htmlFor="cart-pincode" className="text-sm font-medium">
                Pincode
              </label>
              <input
                id="cart-pincode"
                value={pincodeDraft}
                onChange={(event) => setPincodeDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit pincode"
                maxLength={6}
                inputMode="numeric"
                autoComplete="postal-code"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {deliveryError && <p className="text-sm text-danger-600">{deliveryError}</p>}
              {delivery && pincode && (
                <p className="text-sm text-success-600">{delivery.message}</p>
              )}
              <Button type="submit" disabled={pincodeDraft.trim().length !== 6}>
                Check
              </Button>
            </form>
          </Dialog>

          {appliedOffer ? (
            <div className="rounded-xl border border-[#e4d4ff] bg-[#f7f2ff] p-3 dark:border-neutral-700 dark:bg-neutral-900">
              <p className="text-xs text-[#7c3aed]">Best offer for you</p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {appliedOffer.code} applied
                  {Number(appliedOffer.discountAmount) > 0
                    ? ` — you save ${formatInr(appliedOffer.discountAmount)}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="shrink-0 text-sm font-medium text-danger-600 hover:underline"
                  disabled={actionLoading}
                  onClick={() => void runAction(() => removeCoupon(appliedOffer.code))}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            !freeDelivery && (
              <div className="rounded-xl border border-[#e4d4ff] bg-[#f7f2ff] p-3 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="text-xs text-[#7c3aed]">Best offer for you</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Add items worth {formatInr(cart.amountToFreeShipping)} for free delivery
                  </p>
                  <Link
                    href="/men"
                    className="shrink-0 rounded-md border border-[#c4b5fd] bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-100"
                  >
                    Add Item
                  </Link>
                </div>
              </div>
            )
          )}

          {cart.appliedCoupons.length > 1 && (
            <ul className="space-y-1.5">
              {cart.appliedCoupons.slice(1).map((coupon) => (
                <li
                  key={coupon.code}
                  className="flex items-center justify-between rounded-lg bg-success-50 px-3 py-2 text-xs text-success-600"
                >
                  <span className="font-semibold">{coupon.code} applied</span>
                  <button
                    type="button"
                    className="text-danger-600 hover:underline"
                    onClick={() => void runAction(() => removeCoupon(coupon.code))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="flex items-center gap-1 px-1 text-sm font-medium text-[#7c3aed]"
            onClick={() => setCouponOpen((open) => !open)}
          >
            <TagIcon />
            Apply More Coupons/Gift Cards
            <ChevronIcon open={couponOpen} />
          </button>

          {couponOpen && (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!couponCode.trim()) return;
                void runAction(() => applyCoupon(couponCode)).then(() => setCouponCode(""));
              }}
            >
              <label htmlFor="cart-coupon" className="sr-only">
                Coupon code
              </label>
              <input
                id="cart-coupon"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
                placeholder="Enter coupon code"
                className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <Button type="submit" variant="outline" disabled={actionLoading || !couponCode.trim()}>
                Apply
              </Button>
            </form>
          )}

          <PriceDetails
            itemCount={cart.itemCount}
            items={cart.items}
            subtotal={cart.subtotal}
            discount={cart.discount}
            shipping={cart.shipping}
            total={cart.total}
          >
            <Button
              className="mt-4 w-full bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
              disabled={actionLoading || cart.itemCount === 0}
              onClick={handleProceed}
            >
              Proceed
            </Button>
          </PriceDetails>
        </aside>
      </div>

      <StorefrontRecommendationRail
        slot="cart_frequently_bought"
        productSlug={cart.items[0]?.productSlug}
        title="Frequently bought together"
      />
      <StorefrontRecommendationRail slot="cart_trending" title="Items you may have missed" />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-3 lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
        <Button
          className="w-full bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
          disabled={actionLoading || cart.itemCount === 0}
          onClick={handleProceed}
        >
          Proceed · {formatInr(cart.total)}
        </Button>
      </div>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setLoginOpen(false);
          router.push("/checkout");
        }}
      />

      {removeItem && (
        <ClearFromBagModal
          item={removeItem}
          loading={actionLoading}
          onClose={() => setRemoveItem(null)}
          onRemove={() => {
            void runAction(() => removeCartItem(removeItem.id)).then(() => setRemoveItem(null));
          }}
          onSaveForLater={() => {
            void runAction(() => saveForLater(removeItem.id)).then(() => setRemoveItem(null));
          }}
        />
      )}
    </div>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
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

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v8H3V7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4l3 3v2h-7v-5Z" />
      <circle cx="7" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </svg>
  );
}
function BagMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h12l-1 12H7L6 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a3 3 0 1 1 6 0v2" />
    </svg>
  );
}
