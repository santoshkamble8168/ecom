"use client";

import type { CheckoutSession, CustomerAddress } from "@ecom/types";
import { INDIAN_STATES, validateCheckoutAddress } from "@ecom/validation";
import { Button } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CommerceSkeleton } from "@/components/ui/commerce-skeleton";

import { apiFetch, getToken } from "@/lib/auth";
import { formatInr } from "@/lib/cart";
import {
  createCheckout,
  lookupPincode,
  placeOrder,
  reviewCheckout,
  updateCheckoutAddress,
  updateCheckoutPayment,
} from "@/lib/checkout";
import { initiatePayment, payWithRazorpay } from "@/lib/payments";

const LOGIN_HREF = `/account?next=${encodeURIComponent("/checkout")}`;
const ADDRESS_DRAFT_KEY = "ecom_checkout_address_draft";

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

function readAddressDraft(): typeof EMPTY_GUEST_ADDRESS | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ADDRESS_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<typeof EMPTY_GUEST_ADDRESS>;
    return { ...EMPTY_GUEST_ADDRESS, ...parsed, country: "IN" };
  } catch {
    return null;
  }
}

function writeAddressDraft(address: typeof EMPTY_GUEST_ADDRESS): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADDRESS_DRAFT_KEY, JSON.stringify(address));
}

function addressFromSession(address: NonNullable<CheckoutSession["address"]>): typeof EMPTY_GUEST_ADDRESS {
  return {
    label: address.label ?? "Home",
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country || "IN",
    isDefault: false,
  };
}

type FieldKey = "fullName" | "phone" | "line1" | "line2" | "city" | "state" | "postalCode";

export default function CheckoutPage() {
  const router = useRouter();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pincodeHint, setPincodeHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState(EMPTY_GUEST_ADDRESS);
  const [useGuestForm, setUseGuestForm] = useState(!getToken());
  const [editingAddress, setEditingAddress] = useState(true);
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const checkout = await createCheckout();
      setSession(checkout);

      const draft = !checkout.address ? readAddressDraft() : null;
      const hasDraft = Boolean(draft && (draft.fullName || draft.postalCode || draft.line1));

      if (checkout.address) {
        setEditingAddress(false);
        setGuestAddress({
          label: checkout.address.label ?? "Home",
          fullName: checkout.address.fullName,
          phone: checkout.address.phone,
          line1: checkout.address.line1,
          line2: checkout.address.line2 ?? "",
          city: checkout.address.city,
          state: checkout.address.state,
          postalCode: checkout.address.postalCode,
          country: checkout.address.country || "IN",
          isDefault: false,
        });
      } else if (draft && hasDraft) {
        setGuestAddress(draft);
      }

      if (getToken()) {
        setLoggedIn(true);
        const saved = await apiFetch<CustomerAddress[]>("/me/addresses");
        setAddresses(saved);
        const defaultAddr = saved.find((a) => a.isDefault) ?? saved[0];

        if (saved.length === 0 || hasDraft) {
          // No saved addresses, or restore draft after login redirect
          setSelectedAddressId(null);
          setUseGuestForm(true);
        } else if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setUseGuestForm(false);
        }
      } else {
        setLoggedIn(false);
        setUseGuestForm(true);
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

  useEffect(() => {
    const syncAuth = () => setLoggedIn(Boolean(getToken()));
    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("focus", syncAuth);
    window.addEventListener("auth-changed", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  function goToLogin() {
    if (session?.address) {
      writeAddressDraft(addressFromSession(session.address));
    } else if (guestAddress.fullName || guestAddress.line1 || guestAddress.postalCode) {
      writeAddressDraft(guestAddress);
    }
    router.push(LOGIN_HREF);
  }

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

  async function handlePincodeChange(value: string) {
    const postalCode = value.replace(/\D/g, "").slice(0, 6);
    setGuestAddress((prev) => ({ ...prev, postalCode }));
    setFieldErrors((prev) => ({ ...prev, postalCode: undefined }));
    setPincodeHint(null);

    if (postalCode.length !== 6) return;

    try {
      const result = await lookupPincode(postalCode);
      setPincodeHint(result.message);
      if (!result.valid) {
        setFieldErrors((prev) => ({ ...prev, postalCode: result.message }));
        return;
      }
      setGuestAddress((prev) => ({
        ...prev,
        postalCode,
        city: result.city ?? prev.city,
        state: result.state ?? prev.state,
      }));
      if (result.city) {
        setFieldErrors((prev) => ({ ...prev, city: undefined, state: undefined }));
      }
    } catch {
      setPincodeHint("Could not verify pincode — enter city and state manually");
    }
  }

  function validateGuestForm(): boolean {
    const issues = validateCheckoutAddress(guestAddress);
    const next: Partial<Record<FieldKey, string>> = {};
    for (const issue of issues) {
      next[issue.field as FieldKey] = issue.message;
    }
    setFieldErrors(next);
    if (issues.length > 0) {
      setError(issues[0]?.message ?? "Please fix the highlighted fields");
      return false;
    }
    return true;
  }

  async function saveAddress() {
    if (!session) return;

    if (useGuestForm || !loggedIn || addresses.length === 0) {
      if (!validateGuestForm()) return;
      writeAddressDraft(guestAddress);
    } else if (!selectedAddressId) {
      setError("Select a saved address or enter a new one");
      return;
    }

    await runAction(
      () =>
        updateCheckoutAddress(session.id, {
          ...(useGuestForm || !loggedIn || addresses.length === 0
            ? { guestAddress }
            : { addressId: selectedAddressId ?? undefined }),
        }),
      async (updated) => {
        setSession(updated);
        setEditingAddress(false);
        setFieldErrors({});
        if (loggedIn) {
          try {
            const saved = await apiFetch<CustomerAddress[]>("/me/addresses");
            setAddresses(saved);
            if (updated.address?.id) {
              setSelectedAddressId(updated.address.id);
              setUseGuestForm(false);
            }
          } catch {
            // Address book refresh is best-effort
          }
        }
      },
    );
  }

  async function handlePlaceOrder() {
    if (!session) return;
    if (!getToken()) {
      setError("Please log in to place your order");
      goToLogin();
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue");
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!session.paymentMethod) {
        const withPayment = await updateCheckoutPayment(session.id, "razorpay");
        setSession(withPayment);
      }

      const review = await reviewCheckout(session.id);
      setSession(review.session);
      if (!review.valid) {
        setError(review.issues.join(". "));
        return;
      }

      await placeOrder(session.id, crypto.randomUUID());

      const payment = await initiatePayment(session.id);
      const captured = await payWithRazorpay(payment, {
        name: session.address?.fullName,
        contact: session.address?.phone,
      });
      window.dispatchEvent(new Event("cart-updated"));
      setSuccess("Payment successful");
      router.push(`/order/confirmation?order=${encodeURIComponent(captured.order.orderNumber)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete payment";
      if (/unauthorized|login required|jwt|401/i.test(message)) {
        setError("Please log in to place your order");
        goToLogin();
      } else {
        setError(message);
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <CommerceSkeleton className="mx-auto max-w-5xl px-4 py-12" />;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-display font-bold">Checkout unavailable</h1>
        <p className="mt-2 text-neutral-500">{error ?? "Your cart may be empty."}</p>
        <Link
          href="/cart"
          className="mt-6 inline-block rounded-md bg-accent-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
        >
          Back to Cart
        </Link>
      </div>
    );
  }

  const stepDone = {
    address: Boolean(session.address) && !editingAddress,
    shipping: Boolean(session.shipping),
  };

  const inputClass = (field?: FieldKey) =>
    `mt-1 w-full rounded-md border bg-white px-3 py-2 text-neutral-900 ${
      field && fieldErrors[field]
        ? "border-danger-500 focus:outline-none focus:ring-2 focus:ring-danger-500/30"
        : "border-neutral-300 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Checkout</h1>
        <Link href="/cart" className="text-sm font-medium text-info-600 hover:text-info-600/80 hover:underline">
          ← Back to cart
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger-500/40 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-success-500/40 bg-success-50 px-4 py-3 text-sm text-success-700">
          {success}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Address */}
          <section className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
                1. Delivery address
              </h2>
              {stepDone.address && (
                <button
                  type="button"
                  className="text-xs font-medium text-info-600 hover:underline"
                  onClick={() => {
                    setEditingAddress(true);
                  }}
                >
                  Change
                </button>
              )}
            </div>

            {stepDone.address && session.address ? (
              <p className="mt-3 text-sm text-neutral-700">
                <span className="font-medium">{session.address.fullName}</span>
                <br />
                {session.address.line1}
                {session.address.line2 ? `, ${session.address.line2}` : ""}
                <br />
                {session.address.city}, {session.address.state} — {session.address.postalCode}
                <br />
                {session.address.phone}
              </p>
            ) : (
              <>
                {loggedIn && addresses.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => setUseGuestForm(false)}
                      className={`text-xs font-medium ${!useGuestForm ? "text-info-600" : "text-neutral-500"}`}
                    >
                      Saved addresses
                    </button>
                    {!useGuestForm &&
                      addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
                            selectedAddressId === addr.id
                              ? "border-brand-500 bg-brand-50"
                              : "border-neutral-200 hover:border-neutral-400"
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
                      className={`text-xs font-medium ${useGuestForm ? "text-info-600" : "text-neutral-500"}`}
                    >
                      Enter a new address
                    </button>
                  </div>
                )}

                {loggedIn && addresses.length === 0 && (
                  <p className="mt-4 text-sm text-neutral-500">
                    No saved addresses yet. Enter your delivery details below.
                  </p>
                )}

                {(useGuestForm || !loggedIn || addresses.length === 0) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm sm:col-span-2">
                      <span className="text-neutral-500">Full name</span>
                      <input
                        className={inputClass("fullName")}
                        value={guestAddress.fullName}
                        onChange={(e) =>
                          setGuestAddress((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                        autoComplete="name"
                      />
                      {fieldErrors.fullName && (
                        <span className="mt-1 block text-xs text-danger-600">{fieldErrors.fullName}</span>
                      )}
                    </label>

                    <label className="text-sm">
                      <span className="text-neutral-500">Phone</span>
                      <input
                        className={inputClass("phone")}
                        value={guestAddress.phone}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile"
                        onChange={(e) =>
                          setGuestAddress((prev) => ({
                            ...prev,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                          }))
                        }
                        autoComplete="tel"
                      />
                      {fieldErrors.phone && (
                        <span className="mt-1 block text-xs text-danger-600">{fieldErrors.phone}</span>
                      )}
                    </label>

                    <label className="text-sm">
                      <span className="text-neutral-500">Pincode</span>
                      <input
                        className={inputClass("postalCode")}
                        value={guestAddress.postalCode}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit pincode"
                        onChange={(e) => void handlePincodeChange(e.target.value)}
                        autoComplete="postal-code"
                      />
                      {fieldErrors.postalCode && (
                        <span className="mt-1 block text-xs text-danger-600">{fieldErrors.postalCode}</span>
                      )}
                      {!fieldErrors.postalCode && pincodeHint && (
                        <span className="mt-1 block text-xs text-neutral-500">{pincodeHint}</span>
                      )}
                    </label>

                    <label className="text-sm sm:col-span-2">
                      <span className="text-neutral-500">Address line 1</span>
                      <input
                        className={inputClass("line1")}
                        value={guestAddress.line1}
                        onChange={(e) =>
                          setGuestAddress((prev) => ({ ...prev, line1: e.target.value }))
                        }
                        autoComplete="address-line1"
                      />
                      {fieldErrors.line1 && (
                        <span className="mt-1 block text-xs text-danger-600">{fieldErrors.line1}</span>
                      )}
                    </label>

                    <label className="text-sm sm:col-span-2">
                      <span className="text-neutral-500">Address line 2 (optional)</span>
                      <input
                        className={inputClass("line2")}
                        value={guestAddress.line2}
                        onChange={(e) =>
                          setGuestAddress((prev) => ({ ...prev, line2: e.target.value }))
                        }
                        autoComplete="address-line2"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-neutral-500">City</span>
                      <input
                        className={inputClass("city")}
                        value={guestAddress.city}
                        onChange={(e) =>
                          setGuestAddress((prev) => ({ ...prev, city: e.target.value }))
                        }
                        autoComplete="address-level2"
                      />
                      {fieldErrors.city && (
                        <span className="mt-1 block text-xs text-danger-600">{fieldErrors.city}</span>
                      )}
                    </label>

                    <label className="text-sm">
                      <span className="text-neutral-500">State</span>
                      <select
                        className={inputClass("state")}
                        value={guestAddress.state}
                        onChange={(e) =>
                          setGuestAddress((prev) => ({ ...prev, state: e.target.value }))
                        }
                      >
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.state && (
                        <span className="mt-1 block text-xs text-danger-600">{fieldErrors.state}</span>
                      )}
                    </label>
                  </div>
                )}

                <Button
                  className="mt-4 bg-accent-500 text-neutral-950 hover:bg-accent-600"
                  disabled={actionLoading}
                  onClick={() => void saveAddress()}
                >
                  Save address & continue
                </Button>
              </>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Order summary
          </h2>
          <ul className="mt-4 max-h-48 space-y-3 overflow-y-auto">
            {session.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-sm">
                <span className="line-clamp-2 text-neutral-700">
                  {item.product?.title ?? item.productSlug} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium">{formatInr(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm">
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
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatInr(session.pricing.total)}</dd>
            </div>
          </dl>

          <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-info-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-info-600 hover:underline">
                Privacy Policy
              </Link>
              . Prices include applicable GST.
            </span>
          </label>

          {!loggedIn ? (
            <Link
              href={LOGIN_HREF}
              onClick={() => {
                if (session.address) writeAddressDraft(addressFromSession(session.address));
                else writeAddressDraft(guestAddress);
              }}
              className="mt-4 flex w-full items-center justify-center rounded-md bg-brand-600 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-700"
            >
              Login to place order
            </Link>
          ) : (
            <Button
              className="mt-4 w-full bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600 disabled:opacity-50"
              disabled={
                actionLoading ||
                !stepDone.address ||
                !stepDone.shipping ||
                !acceptedTerms ||
                session.status === "order_prepared"
              }
              onClick={() => void handlePlaceOrder()}
            >
              {actionLoading ? "Processing…" : "Pay & Place Order"}
            </Button>
          )}
          <p className="mt-2 text-center text-xs text-neutral-400">
            Easy returns · Order updates by email
          </p>
        </aside>
      </div>
    </div>
  );
}
