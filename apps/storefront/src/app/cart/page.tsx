"use client";

import type { CartSummary } from "@ecom/types";
import { Button, PriceDisplay } from "@ecom/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

export default function CartPage() {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-neutral-500">Loading cart…</div>;
  }

  if (!cart || cart.itemCount === 0 && cart.savedForLater.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-display font-bold">Your cart is empty</h1>
        <p className="mt-2 text-neutral-500">Add items from the shop to get started.</p>
        <Link href="/men" className="mt-6 inline-block text-brand-700 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const progress =
    cart.freeShippingThreshold > 0
      ? Math.min(100, (Number(cart.subtotal) / cart.freeShippingThreshold) * 100)
      : 100;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-display font-bold">Shopping Cart ({cart.itemCount})</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded bg-neutral-100">
                {item.product?.primaryImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.primaryImage.url}
                    alt={item.product.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <Link href={`/products/${item.productSlug}`} className="font-semibold hover:underline">
                  {item.product?.title ?? item.productSlug}
                </Link>
                {item.variantLabel && <p className="text-sm text-neutral-500">{item.variantLabel}</p>}
                <PriceDisplay price={item.unitPrice} className="mt-1" />
                {!item.available && <p className="text-sm text-red-600">Unavailable</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border px-2"
                      disabled={actionLoading}
                      onClick={() => void runAction(() => updateCartItem(item.id, item.quantity - 1))}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="rounded border px-2"
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
                    onClick={() => void runAction(() => removeCartItem(item.id))}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="font-semibold">{formatInr(item.lineTotal)}</p>
            </div>
          ))}

          {cart.savedForLater.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Saved for later</h2>
              {cart.savedForLater.map((item) => (
                <div key={item.id} className="mb-3 flex items-center justify-between rounded border p-3">
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
                    Move to cart
                  </Button>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="mb-4 font-semibold">Order summary</h2>

          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-neutral-500">
              <span>Free shipping at {formatInr(cart.freeShippingThreshold)}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full bg-brand-700" style={{ width: `${progress}%` }} />
            </div>
            {Number(cart.amountToFreeShipping) > 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                Add {formatInr(cart.amountToFreeShipping)} more for free shipping
              </p>
            )}
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatInr(cart.subtotal)}</dd>
            </div>
            {Number(cart.discount) > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Discount</dt>
                <dd>−{formatInr(cart.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{Number(cart.shipping) === 0 ? "FREE" : formatInr(cart.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatInr(cart.total)}</dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code"
              className="flex-1 rounded border px-3 py-2 text-sm"
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
            <ul className="mt-2 space-y-1 text-xs">
              {cart.appliedCoupons.map((c) => (
                <li key={c.code} className="flex justify-between">
                  <span>{c.code}</span>
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

          <p className="mt-2 text-xs text-neutral-500">Try: WELCOME10, FLAT100, FREESHIP</p>

          <Button className="mt-6 w-full" disabled>
            Proceed to checkout (Sprint 7)
          </Button>
        </aside>
      </div>
    </div>
  );
}
