"use client";

import type { CartLineItem, CartSummary, DeliveryEstimate } from "@ecom/types";
import { Button, PriceDisplay, Dialog } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { StorefrontImage } from "@/components/media/storefront-image";
import { CommerceSkeleton } from "@/components/ui/commerce-skeleton";

import { CartStripBanner } from "@/components/cms/cart-strip-banner";
import { StorefrontRecommendationRail } from "@/components/recommendations/recommendation-rail";
import { apiFetch } from "@/lib/auth";
import {
  applyCoupon,
  fetchCart,
  formatInr,
  moveToCart,
  removeCartItem,
  removeCoupon,
  saveForLater,
  updateCartItem,
} from "@/lib/cart";

function discountPercent(base?: string | null, compare?: string | null): number | null {
  if (!base || !compare) return null;
  const b = Number(base);
  const c = Number(compare);
  if (c <= b) return null;
  return Math.round(((c - b) / c) * 100);
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

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState<DeliveryEstimate | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [removeItem, setRemoveItem] = useState<CartLineItem | null>(null);

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

  async function checkDelivery() {
    setDeliveryError(null);
    setDelivery(null);
    try {
      const result = await apiFetch<DeliveryEstimate>("/delivery/estimate", {
        method: "POST",
        body: JSON.stringify({ pincode }),
      });
      setDelivery(result);
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Could not check delivery");
    }
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

  const progress =
    cart.freeShippingThreshold > 0
      ? Math.min(100, (Number(cart.subtotal) / cart.freeShippingThreshold) * 100)
      : 100;
  const totalSavings = cart.items.reduce((sum, item) => {
    const compare = item.product?.compareAtPrice;
    if (!compare) return sum;
    const diff = Number(compare) - Number(item.unitPrice);
    return diff > 0 ? sum + diff * item.quantity : sum;
  }, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-8">
      <CartStripBanner />
      <nav className="mb-3 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span className="text-neutral-900 dark:text-neutral-200">My Bag</span>
      </nav>
      <h1 className="mb-4 text-2xl font-display font-bold">
        My Bag{" "}
        <span className="font-normal text-neutral-500">
          ({cart.itemCount} Item{cart.itemCount === 1 ? "" : "s"})
        </span>
      </h1>

      {totalSavings > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-success-50 px-4 py-2.5 text-sm font-medium text-success-700">
          <span aria-hidden="true">%</span>
          You are saving {formatInr(totalSavings)} on this order
        </div>
      )}

      {error && <p className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => {
            const discount = discountPercent(item.unitPrice, item.product?.compareAtPrice);
            const lineSavings =
              item.product?.compareAtPrice != null
                ? Math.max(0, Number(item.product.compareAtPrice) - Number(item.unitPrice)) *
                  item.quantity
                : 0;
            return (
              <div
                key={item.id}
                className="relative flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <Link
                  href={`/products/${item.productSlug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-neutral-100"
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
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-6">
                      <Link href={`/products/${item.productSlug}`} className="font-semibold hover:underline">
                        {item.product?.title ?? item.productSlug}
                      </Link>
                      {item.variantLabel && (
                        <p className="text-sm text-neutral-500">Size: {item.variantLabel}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900"
                      disabled={actionLoading}
                      onClick={() => setRemoveItem(item)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-1 flex items-baseline gap-2">
                    <PriceDisplay price={item.unitPrice} compareAtPrice={item.product?.compareAtPrice} />
                    {discount && (
                      <span className="text-xs font-semibold text-success-600">{discount}% off</span>
                    )}
                  </div>
                  {lineSavings > 0 && (
                    <p className="mt-0.5 text-xs font-medium text-success-600">
                      You saved {formatInr(lineSavings)}
                    </p>
                  )}

                  {!item.available && <p className="mt-1 text-sm text-danger-600">Unavailable</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center rounded border border-neutral-300 dark:border-neutral-700">
                      <button
                        type="button"
                        className="px-3 py-1 text-lg disabled:opacity-40"
                        disabled={actionLoading}
                        onClick={() => void runAction(() => updateCartItem(item.id, item.quantity - 1))}
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="px-3 py-1 text-lg disabled:opacity-40"
                        disabled={actionLoading || item.quantity >= 10}
                        onClick={() => void runAction(() => updateCartItem(item.id, item.quantity + 1))}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-neutral-500 hover:underline"
                      disabled={actionLoading}
                      onClick={() => void runAction(() => saveForLater(item.id))}
                    >
                      Save for later
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
            <p className="text-sm font-semibold">Check delivery availability</p>
            <div className="mt-2 flex gap-2">
              <label htmlFor="cart-pincode" className="sr-only">
                Delivery pincode
              </label>
              <input
                id="cart-pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter pincode"
                maxLength={6}
                inputMode="numeric"
                autoComplete="postal-code"
                className="max-w-[200px] flex-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
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
            {deliveryError && <p className="mt-2 text-sm text-danger-600">{deliveryError}</p>}
          </div>

          {cart.savedForLater.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Saved for later ({cart.savedForLater.length})</h2>
              {cart.savedForLater.map((item) => (
                <div
                  key={item.id}
                  className="mb-3 flex items-center justify-between gap-3 rounded border border-neutral-200 p-3 dark:border-neutral-800"
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
                    Move to bag
                  </Button>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="mb-2 text-sm font-semibold">Have a coupon?</p>
            <div className="flex gap-2">
              <label htmlFor="cart-coupon" className="sr-only">
                Coupon code
              </label>
              <input
                id="cart-coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code"
                className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <Button
                variant="outline"
                disabled={actionLoading || !couponCode}
                onClick={() => void runAction(() => applyCoupon(couponCode))}
              >
                Apply
              </Button>
            </div>

            {cart.appliedCoupons.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {cart.appliedCoupons.map((c) => (
                  <li
                    key={c.code}
                    className="flex items-center justify-between rounded bg-success-50 px-2 py-1.5 text-xs text-success-600 dark:bg-neutral-900"
                  >
                    <span className="font-semibold">{c.code} applied</span>
                    <button
                      type="button"
                      className="text-danger-600 hover:underline"
                      onClick={() => void runAction(() => removeCoupon(c.code))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-neutral-400">Try: WELCOME10, FLAT100, FREESHIP</p>
          </div>

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="mb-4 font-semibold">Price Summary</h2>

            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-neutral-500">
                <span>Free shipping at {formatInr(cart.freeShippingThreshold)}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="h-full bg-accent-600" style={{ width: `${progress}%` }} />
              </div>
              {Number(cart.amountToFreeShipping) > 0 ? (
                <p className="mt-1 text-xs text-neutral-500">
                  Add {formatInr(cart.amountToFreeShipping)} more for free shipping
                </p>
              ) : (
                <p className="mt-1 text-xs font-medium text-success-600">
                  Yayy! You get FREE DELIVERY on this order
                </p>
              )}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd>{formatInr(cart.subtotal)}</dd>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-success-600">
                  <dt>Total savings</dt>
                  <dd>−{formatInr(totalSavings)}</dd>
                </div>
              )}
              {Number(cart.discount) > 0 && (
                <div className="flex justify-between text-success-600">
                  <dt>Coupon discount</dt>
                  <dd>−{formatInr(cart.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500">Shipping</dt>
                <dd>{Number(cart.shipping) === 0 ? "FREE" : formatInr(cart.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold dark:border-neutral-800">
                <dt>Total</dt>
                <dd>{formatInr(cart.total)}</dd>
              </div>
            </dl>

            <Button
              className="mt-6 w-full bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
              disabled={actionLoading || cart.itemCount === 0}
              onClick={() => router.push("/checkout")}
            >
              Proceed
            </Button>

            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-neutral-200 pt-4 text-center dark:border-neutral-800">
              <p className="text-[11px] text-neutral-500">Quality Assurance</p>
              <p className="text-[11px] text-neutral-500">100% Secure Payment</p>
              <p className="text-[11px] text-neutral-500">Easy Returns</p>
            </div>
          </div>
        </aside>
      </div>

      <StorefrontRecommendationRail
        slot="cart_frequently_bought"
        productSlug={cart.items[0]?.productSlug}
        title="Frequently bought together"
      />
      <StorefrontRecommendationRail slot="cart_trending" title="You may also like" />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-3 lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
        <Button
          className="w-full bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
          disabled={actionLoading || cart.itemCount === 0}
          onClick={() => router.push("/checkout")}
        >
          Proceed · {formatInr(cart.total)}
        </Button>
      </div>

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
