"use client";

import type { CartSummary, DeliveryEstimate } from "@ecom/types";
import { Button, PriceDisplay } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

/* ────────────────────────────────────────────────────────────────────
   Clear From Bag Modal
──────────────────────────────────────────────────────────────────── */
interface ClearFromBagModalProps {
  item: CartSummary["items"][number] | null;
  onClose: () => void;
  onRemove: () => void;
  onSaveForLater: () => void;
  actionLoading: boolean;
}

function ClearFromBagModal({
  item,
  onClose,
  onRemove,
  onSaveForLater,
  actionLoading,
}: ClearFromBagModalProps) {
  if (!item) return null;

  const compareAt = item.product?.compareAtPrice;
  const unitPrice = item.unitPrice;
  const savings = compareAt && Number(compareAt) > Number(unitPrice)
    ? (Number(compareAt) - Number(unitPrice)) * item.quantity
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
        aria-hidden="true"
      />
      
      {/* modal box */}
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-950 animate-slide-up">
        {/* close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close modal"
        >
          ✕
        </button>

        <h2 className="mb-2 text-lg font-bold">Clear From Bag</h2>
        <p className="mb-4 text-sm text-neutral-500">Are you sure want to remove this item from bag?</p>

        {/* Product card inside modal */}
        <div className="mb-6 flex gap-4 rounded-lg border border-neutral-100 p-3 dark:border-neutral-900">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-neutral-100">
            {item.product?.primaryImage && (
              <img
                src={item.product.primaryImage.url}
                alt={item.product.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {item.product?.brand ?? "Bewakoof®"}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
              {item.product?.title ?? item.productSlug}
            </p>
            <p className="mt-1 text-xs text-neutral-450 dark:text-neutral-400">
              Ships in 1-2 days
            </p>
            
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                ₹{Number(unitPrice).toLocaleString("en-IN")}
              </span>
              {compareAt && (
                <span className="text-xs text-neutral-450 line-through">
                  ₹{Number(compareAt).toLocaleString("en-IN")}
                </span>
              )}
              {savings > 0 && (
                <span className="text-xs font-semibold text-success-600">
                  You saved ₹{savings.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={actionLoading}
            onClick={onRemove}
            className="flex-1 rounded-md border border-neutral-350 py-3 text-sm font-bold uppercase tracking-wide text-neutral-700 hover:bg-neutral-50 dark:border-neutral-805 dark:text-neutral-300 dark:hover:bg-neutral-900 transition-colors"
          >
            REMOVE
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={onSaveForLater}
            className="flex-1 rounded-md bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600 transition-colors"
          >
            SAVE FOR LATER
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Main Cart Page
──────────────────────────────────────────────────────────────────── */
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
  const [itemToRemove, setItemToRemove] = useState<CartSummary["items"][number] | null>(null);

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
    return <div className="mx-auto max-w-5xl px-4 py-12 text-neutral-500">Loading cart…</div>;
  }

  if (!cart || (cart.itemCount === 0 && cart.savedForLater.length === 0)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-display font-bold">Your bag is empty</h1>
        <p className="mt-2 text-neutral-500">Add items from the shop to get started.</p>
        <Link
          href="/men"
          className="mt-6 inline-block rounded-md bg-accent-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-accent-700"
        >
          Continue Shopping
        </Link>
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-3 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span className="text-neutral-900 dark:text-neutral-200">My Bag</span>
      </nav>
      <h1 className="mb-6 text-2xl font-display font-bold">
        My Bag <span className="font-normal text-neutral-500">({cart.itemCount} items)</span>
      </h1>
      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => {
            const discount = discountPercent(item.unitPrice, item.product?.compareAtPrice);
            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <Link href={`/products/${item.productSlug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded bg-neutral-100">
                  {item.product?.primaryImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.primaryImage.url}
                      alt={item.product.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="font-semibold hover:underline">
                        {item.product?.title ?? item.productSlug}
                      </Link>
                      {item.variantLabel && <p className="text-sm text-neutral-500">Size: {item.variantLabel}</p>}
                    </div>
                    <p className="font-semibold">{formatInr(item.lineTotal)}</p>
                  </div>

                  <div className="mt-1 flex items-baseline gap-2">
                    <PriceDisplay price={item.unitPrice} compareAtPrice={item.product?.compareAtPrice} />
                    {discount && <span className="text-xs font-semibold text-success-600">{discount}% off</span>}
                  </div>

                  {!item.available && <p className="mt-1 text-sm text-red-600">Unavailable</p>}

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
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      disabled={actionLoading}
                      onClick={() => setItemToRemove(item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
            <p className="text-sm font-semibold">Check delivery availability</p>
            <div className="mt-2 flex gap-2">
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter pincode"
                maxLength={6}
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
            {deliveryError && <p className="mt-2 text-sm text-red-600">{deliveryError}</p>}
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
              <input
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
                      className="text-red-600 hover:underline"
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
            <h2 className="mb-4 font-semibold">Order Summary</h2>

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
                <p className="mt-1 text-xs font-medium text-success-600">Yay! You get FREE delivery</p>
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
              className="mt-6 w-full bg-accent-600 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-accent-700"
              disabled={actionLoading || cart.itemCount === 0}
              onClick={() => router.push("/checkout")}
            >
              Proceed to Checkout
            </Button>

            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-neutral-200 pt-4 text-center dark:border-neutral-800">
              <p className="text-[11px] text-neutral-500">100% Genuine</p>
              <p className="text-[11px] text-neutral-500">Secure Payments</p>
              <p className="text-[11px] text-neutral-500">Easy Returns</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Clear From Bag Modal */}
      <ClearFromBagModal
        item={itemToRemove}
        onClose={() => setItemToRemove(null)}
        onRemove={() => {
          if (itemToRemove) {
            void runAction(() => removeCartItem(itemToRemove.id));
            setItemToRemove(null);
          }
        }}
        onSaveForLater={() => {
          if (itemToRemove) {
            void runAction(() => saveForLater(itemToRemove.id));
            setItemToRemove(null);
          }
        }}
        actionLoading={actionLoading}
      />
    </div>
  );
}
