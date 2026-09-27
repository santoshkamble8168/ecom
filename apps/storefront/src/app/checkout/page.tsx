"use client";

import type { CheckoutSession, CustomerAddress } from "@ecom/types";
import { INDIAN_STATES, validateCheckoutAddress } from "@ecom/validation";
import { Button } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { PriceDetails } from "@/components/checkout/price-details";
import { CommerceSkeleton } from "@/components/ui/commerce-skeleton";

import { apiFetch, ensureAccessToken, getToken } from "@/lib/auth";
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
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pincodeHint, setPincodeHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState(EMPTY_GUEST_ADDRESS);
  const [useGuestForm, setUseGuestForm] = useState(!getToken());
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await ensureAccessToken();
      setLoggedIn(Boolean(accessToken));
      setUseGuestForm(!accessToken);

      const checkout = await createCheckout();
      setSession(checkout);

      const draft = !checkout.address ? readAddressDraft() : null;
      const hasDraft = Boolean(draft && (draft.fullName || draft.postalCode || draft.line1));

      if (checkout.address && !checkout.address.id) {
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

      if (accessToken) {
        try {
          const saved = await apiFetch<CustomerAddress[]>("/me/addresses");
          setAddresses(saved);
          if (saved.length === 0) {
            setUseGuestForm(true);
            if (draft && hasDraft) setGuestAddress(draft);
          } else {
            const matched = checkout.address?.id
              ? saved.find((address) => address.id === checkout.address?.id)
              : undefined;
            const selected = matched ?? saved.find((address) => address.isDefault) ?? saved[0];
            if (!selected) {
              setUseGuestForm(true);
            } else {
              setSelectedAddressId(selected.id);
              setUseGuestForm(false);
              if (checkout.address?.id !== selected.id) {
                const updated = await updateCheckoutAddress(checkout.id, { addressId: selected.id });
                setSession(updated);
              }
            }
          }
        } catch (err) {
          setUseGuestForm(true);
          const message = err instanceof Error ? err.message : "Could not load saved addresses";
          if (!/unauthorized/i.test(message)) setError(message);
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

  function addressPayload() {
    return {
      label: guestAddress.label?.trim() || "Home",
      fullName: guestAddress.fullName,
      phone: guestAddress.phone,
      line1: guestAddress.line1,
      line2: guestAddress.line2.trim() || undefined,
      city: guestAddress.city,
      state: guestAddress.state,
      postalCode: guestAddress.postalCode,
      country: "IN" as const,
    };
  }

  async function selectSavedAddress(addressId: string) {
    if (!session || addressId === session.address?.id) {
      setSelectedAddressId(addressId);
      setUseGuestForm(false);
      setEditingAddressId(null);
      return;
    }
    setSelectedAddressId(addressId);
    setUseGuestForm(false);
    setEditingAddressId(null);
    await runAction(
      () => updateCheckoutAddress(session.id, { addressId }),
      (updated) => setSession(updated),
    );
  }

  function startEditAddress(address: CustomerAddress) {
    setEditingAddressId(address.id);
    setUseGuestForm(true);
    setFieldErrors({});
    setGuestAddress({
      label: address.label ?? "Home",
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country || "IN",
      isDefault: address.isDefault,
    });
  }

  async function saveAddress() {
    if (!session) return;

    if (!validateGuestForm()) return;
    writeAddressDraft(guestAddress);

    if (editingAddressId) {
      await runAction(async () => {
        await apiFetch(`/me/addresses/${editingAddressId}`, {
          method: "PATCH",
          body: JSON.stringify(addressPayload()),
        });
        return updateCheckoutAddress(session.id, { addressId: editingAddressId });
      }, async (updated) => {
        setSession(updated);
        setFieldErrors({});
        setEditingAddressId(null);
        setUseGuestForm(false);
        setSelectedAddressId(editingAddressId);
        try {
          setAddresses(await apiFetch<CustomerAddress[]>("/me/addresses"));
        } catch {
          // Address book refresh is best-effort
        }
      });
      return;
    }

    await runAction(
      () => updateCheckoutAddress(session.id, { guestAddress }),
      async (updated) => {
        setSession(updated);
        setFieldErrors({});
        if (loggedIn) {
          try {
            const saved = await apiFetch<CustomerAddress[]>("/me/addresses");
            setAddresses(saved);
            if (updated.address?.id) {
              setSelectedAddressId(updated.address.id);
              setUseGuestForm(false);
              setEditingAddressId(null);
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
    const accessToken = await ensureAccessToken();
    if (!accessToken) {
      setLoggedIn(false);
      setError("Please log in to place your order");
      goToLogin();
      return;
    }
    setActionLoading(true);
    setPlacingOrder(true);
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
        setPlacingOrder(false);
        setError(review.issues.join(". "));
        return;
      }

      await placeOrder(session.id, crypto.randomUUID());

      const payment = await initiatePayment(session.id);
      setPaymentOpen(true);
      const captured = await payWithRazorpay(payment, {
        name: session.address?.fullName,
        contact: session.address?.phone,
      });
      setPaymentOpen(false);
      window.dispatchEvent(new Event("cart-updated"));
      setSuccess("Payment successful");
      router.push(`/order/confirmation?order=${encodeURIComponent(captured.order.orderNumber)}`);
    } catch (err) {
      setPlacingOrder(false);
      setPaymentOpen(false);
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
    address: Boolean(session.address),
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
      <CheckoutSteps current={stepDone.address && stepDone.shipping ? "payment" : "address"} />
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
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              1. Delivery address
            </h2>

            {loggedIn && addresses.length > 0 && (
              <div className="mt-4">
                <div
                  className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1"
                  role="tablist"
                  aria-label="Delivery address"
                >
                  <button
                    type="button"
                    role="tab"
                        aria-selected={!useGuestForm || Boolean(editingAddressId)}
                        onClick={() => {
                          setUseGuestForm(false);
                          setEditingAddressId(null);
                        }}
                        className={`rounded-md px-3 py-2 text-sm font-semibold ${
                          !useGuestForm || editingAddressId
                            ? "bg-white text-neutral-950 shadow-sm"
                            : "text-neutral-600 hover:text-neutral-950"
                        }`}
                  >
                    Saved addresses
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={useGuestForm && !editingAddressId}
                    onClick={() => {
                      setEditingAddressId(null);
                      setGuestAddress(EMPTY_GUEST_ADDRESS);
                      setFieldErrors({});
                      setUseGuestForm(true);
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${
                      useGuestForm && !editingAddressId
                        ? "bg-white text-neutral-950 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-950"
                    }`}
                  >
                    New address
                  </button>
                </div>
                {!useGuestForm && (
                  <div className="mt-3 space-y-2">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`flex items-start gap-3 rounded-md border p-3 ${
                          selectedAddressId === addr.id
                            ? "border-brand-500 bg-brand-50"
                            : "border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer gap-3">
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddressId === addr.id}
                            onChange={() => void selectSavedAddress(addr.id)}
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
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                          onClick={() => startEditAddress(addr)}
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {loggedIn && addresses.length === 0 && (
              <p className="mt-4 text-sm text-neutral-500">
                No saved addresses yet. Enter your delivery details below.
              </p>
            )}

            {(useGuestForm || !loggedIn || addresses.length === 0) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {editingAddressId && (
                  <p className="text-sm font-medium text-neutral-700 sm:col-span-2">Edit this address</p>
                )}
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

            {(useGuestForm || !loggedIn || addresses.length === 0) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  className="bg-accent-500 text-neutral-950 hover:bg-accent-600"
                  disabled={actionLoading}
                  onClick={() => void saveAddress()}
                >
                  {editingAddressId ? "Save changes" : "Save address & continue"}
                </Button>
                {editingAddressId && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => {
                      setEditingAddressId(null);
                      setUseGuestForm(false);
                      setFieldErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <PriceDetails
            itemCount={session.items.reduce((count, item) => count + item.quantity, 0)}
            items={session.items}
            subtotal={session.pricing.subtotal}
            discount={session.pricing.discount}
            shipping={session.pricing.shipping}
            tax={session.pricing.tax}
            total={session.pricing.total}
          >
            {!loggedIn ? (
              <Link
                href={LOGIN_HREF}
                onClick={() => {
                  if (session.address) writeAddressDraft(addressFromSession(session.address));
                  else writeAddressDraft(guestAddress);
                }}
                className="mt-4 flex w-full items-center justify-center rounded-md bg-accent-500 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
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
                  session.status === "order_prepared"
                }
                onClick={() => void handlePlaceOrder()}
              >
                {actionLoading ? "Processing…" : "Pay & Place Order"}
              </Button>
            )}
          </PriceDetails>
        </aside>
      </div>
      {placingOrder && !paymentOpen && <PlacingOrderOverlay />}
    </div>
  );
}

function PlacingOrderOverlay() {
  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-white/85 px-4 backdrop-blur-sm dark:bg-neutral-950/85"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-md">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-accent-600" />
        <p className="text-center text-lg font-semibold">Placing your order</p>
        <p className="mt-1 text-center text-sm text-neutral-500">Please wait while we confirm payment.</p>
        <div className="mt-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-10 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
