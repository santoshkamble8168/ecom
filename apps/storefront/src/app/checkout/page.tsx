"use client";

import type { CheckoutSession, CustomerAddress, ShippingOption } from "@ecom/types";
import { Button } from "@ecom/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiFetch, getToken } from "@/lib/auth";
import { formatInr } from "@/lib/cart";
import {
  createCheckout,
  fetchShippingOptions,
  placeOrder,
  reviewCheckout,
  updateCheckoutAddress,
  updateCheckoutPayment,
  updateCheckoutShipping,
} from "@/lib/checkout";

const EMPTY_GUEST_ADDRESS = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  isDefault: false,
};

export default function CheckoutPage() {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState(EMPTY_GUEST_ADDRESS);
  const [useGuestForm, setUseGuestForm] = useState(!getToken());
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay" | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const checkout = await createCheckout();
      setSession(checkout);

      if (getToken()) {
        const saved = await apiFetch<CustomerAddress[]>("/me/addresses");
        setAddresses(saved);
        const defaultAddr = saved.find((a) => a.isDefault) ?? saved[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setUseGuestForm(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  async function runAction<T>(action: () => Promise<T>, onSuccess: (result: T) => void) {
    setActionLoading(true);
    setError(null);
    try {
      const result = await action();
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveAddress() {
    if (!session) return;
    await runAction(
      () =>
        updateCheckoutAddress(session.id, {
          ...(useGuestForm
            ? { guestAddress }
            : { addressId: selectedAddressId ?? undefined }),
        }),
      async (updated) => {
        setSession(updated);
        const options = await fetchShippingOptions(updated.id);
        setShippingOptions(options);
        if (options[0]) setSelectedShipping(options[0].code);
      },
    );
  }

  async function saveShipping() {
    if (!session || !selectedShipping) return;
    await runAction(
      () => updateCheckoutShipping(session.id, selectedShipping),
      (updated) => setSession(updated),
    );
  }

  async function savePayment() {
    if (!session || !paymentMethod) return;
    await runAction(
      () => updateCheckoutPayment(session.id, paymentMethod),
      (updated) => setSession(updated),
    );
  }

  async function handlePlaceOrder() {
    if (!session) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const review = await reviewCheckout(session.id);
      setSession(review.session);
      if (!review.valid) {
        setError(review.issues.join(". "));
        return;
      }

      const result = await placeOrder(session.id, crypto.randomUUID());
      setSuccess(result.message);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: "order_prepared",
              preparedOrderRef: result.preparedOrderRef,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-neutral-500">Preparing checkout…</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-display font-bold">Checkout unavailable</h1>
        <p className="mt-2 text-neutral-500">{error ?? "Your cart may be empty."}</p>
        <Link
          href="/cart"
          className="mt-6 inline-block rounded-md bg-accent-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white"
        >
          Back to Cart
        </Link>
      </div>
    );
  }

  const stepDone = {
    address: Boolean(session.address),
    shipping: Boolean(session.shipping),
    payment: Boolean(session.paymentMethod),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Checkout</h1>
        <Link href="/cart" className="text-sm text-accent-600 hover:underline">
          ← Back to cart
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {success}
          {session.preparedOrderRef && (
            <p className="mt-1 text-xs opacity-80">Reference: {session.preparedOrderRef}</p>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Address */}
          <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              1. Delivery address
            </h2>

            {getToken() && addresses.length > 0 && (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setUseGuestForm(false)}
                  className={`text-xs font-medium ${!useGuestForm ? "text-accent-600" : "text-neutral-500"}`}
                >
                  Saved addresses
                </button>
                {!useGuestForm &&
                  addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
                        selectedAddressId === addr.id
                          ? "border-accent-500 bg-accent-50 dark:bg-accent-950"
                          : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <span className="font-medium">{addr.fullName}</span>
                        <br />
                        {addr.line1}, {addr.city} — {addr.postalCode}
                        <br />
                        {addr.phone}
                      </span>
                    </label>
                  ))}
                <button
                  type="button"
                  onClick={() => setUseGuestForm(true)}
                  className={`text-xs font-medium ${useGuestForm ? "text-accent-600" : "text-neutral-500"}`}
                >
                  Enter a new address
                </button>
              </div>
            )}

            {(useGuestForm || !getToken()) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["fullName", "Full name"],
                    ["phone", "Phone"],
                    ["line1", "Address line 1"],
                    ["line2", "Address line 2 (optional)"],
                    ["city", "City"],
                    ["state", "State"],
                    ["postalCode", "Pincode"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm">
                    <span className="text-neutral-500">{label}</span>
                    <input
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                      value={guestAddress[key] ?? ""}
                      onChange={(e) =>
                        setGuestAddress((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
            )}

            {!stepDone.address && (
              <Button
                className="mt-4 bg-accent-600 text-white hover:bg-accent-700"
                disabled={actionLoading}
                onClick={() => void saveAddress()}
              >
                Save address
              </Button>
            )}
            {stepDone.address && session.address && (
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                Delivering to {session.address.fullName}, {session.address.postalCode}
              </p>
            )}
          </section>

          {/* Shipping */}
          <section
            className={`rounded-lg border p-5 ${stepDone.address ? "border-neutral-200 dark:border-neutral-800" : "border-neutral-100 opacity-60 dark:border-neutral-900"}`}
          >
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              2. Delivery option
            </h2>
            {stepDone.address && shippingOptions.length > 0 && (
              <div className="mt-4 space-y-2">
                {shippingOptions.map((option) => (
                  <label
                    key={option.code}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-3 ${
                      selectedShipping === option.code
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-950"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedShipping === option.code}
                        onChange={() => setSelectedShipping(option.code)}
                      />
                      <span>
                        <span className="font-medium">{option.label}</span>
                        <br />
                        <span className="text-xs text-neutral-500">
                          {option.estimatedDaysMin}–{option.estimatedDaysMax} business days
                        </span>
                      </span>
                    </span>
                    <span className="text-sm font-medium">
                      {Number(option.fee) === 0 ? "FREE" : formatInr(option.fee)}
                    </span>
                  </label>
                ))}
                {!stepDone.shipping && (
                  <Button
                    className="mt-2 bg-accent-600 text-white hover:bg-accent-700"
                    disabled={actionLoading || !selectedShipping}
                    onClick={() => void saveShipping()}
                  >
                    Continue
                  </Button>
                )}
              </div>
            )}
            {stepDone.shipping && session.shipping && (
              <p className="mt-3 text-sm text-neutral-600">
                {session.shipping.label} — {formatInr(session.shipping.fee)}
              </p>
            )}
          </section>

          {/* Payment placeholder */}
          <section
            className={`rounded-lg border p-5 ${stepDone.shipping ? "border-neutral-200 dark:border-neutral-800" : "border-neutral-100 opacity-60 dark:border-neutral-900"}`}
          >
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              3. Payment method
            </h2>
            {stepDone.shipping && (
              <div className="mt-4 space-y-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <span className="text-sm font-medium">Cash on Delivery</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-100 p-3 opacity-60 dark:border-neutral-900">
                  <input type="radio" name="payment" disabled />
                  <span className="text-sm">
                    Pay Online (Razorpay)
                    <span className="ml-2 text-xs text-neutral-400">— Sprint 8</span>
                  </span>
                </label>
                {!stepDone.payment && (
                  <Button
                    className="mt-2 bg-accent-600 text-white hover:bg-accent-700"
                    disabled={actionLoading || !paymentMethod}
                    onClick={() => void savePayment()}
                  >
                    Continue
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Order summary */}
        <aside className="h-fit rounded-lg border border-neutral-200 p-5 lg:sticky lg:top-24 dark:border-neutral-800">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Order summary
          </h2>
          <ul className="mt-4 max-h-48 space-y-3 overflow-y-auto">
            {session.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-sm">
                <span className="line-clamp-2 text-neutral-700 dark:text-neutral-300">
                  {item.product?.title ?? item.productSlug} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium">{formatInr(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd>{formatInr(session.pricing.subtotal)}</dd>
            </div>
            {Number(session.pricing.discount) > 0 && (
              <div className="flex justify-between text-success-600">
                <dt>Discount</dt>
                <dd>−{formatInr(session.pricing.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Shipping</dt>
              <dd>
                {Number(session.pricing.shipping) === 0
                  ? "FREE"
                  : formatInr(session.pricing.shipping)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Tax (GST)</dt>
              <dd>{formatInr(session.pricing.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold dark:border-neutral-800">
              <dt>Total</dt>
              <dd>{formatInr(session.pricing.total)}</dd>
            </div>
          </dl>

          <Button
            className="mt-6 w-full bg-accent-600 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-accent-700"
            disabled={
              actionLoading ||
              !stepDone.payment ||
              session.status === "order_prepared"
            }
            onClick={() => void handlePlaceOrder()}
          >
            {session.status === "order_prepared" ? "Order Prepared" : "Place Order"}
          </Button>
          <p className="mt-2 text-center text-xs text-neutral-400">
            Payment collection arrives in Sprint 8
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-neutral-200 pt-4 text-center dark:border-neutral-800">
            <p className="text-[11px] text-neutral-500">100% Genuine</p>
            <p className="text-[11px] text-neutral-500">Secure Payments</p>
            <p className="text-[11px] text-neutral-500">Easy Returns</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
