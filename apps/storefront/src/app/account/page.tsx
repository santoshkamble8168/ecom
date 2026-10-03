"use client";

import type {
  CustomerAddress,
  CustomerOrderSummary,
  NotificationPreferences,
  PatchNotificationPreferences,
  UserProfile,
} from "@ecom/types";
import type { WishlistItem } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, NotificationPreferenceRow, ProductCard } from "@ecom/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AccountSidebar } from "@/components/account/account-sidebar";
import { StorefrontImage } from "@/components/media/storefront-image";
import { StorefrontRecommendationRail } from "@/components/recommendations/recommendation-rail";
import { CommerceSkeleton } from "@/components/ui/commerce-skeleton";
import { apiFetch, authHeaders, clearSession, hasSession, setSession, signOut } from "@/lib/auth";
import { formatInr, mergeCartOnLogin, moveWishlistToCart } from "@/lib/cart";
import { orderStatusMeta } from "@/lib/orders";
import { getSessionId } from "@/lib/session";
import { getApiUrl } from "@/lib/api-url";

type Tab = "orders" | "profile" | "addresses" | "preferences" | "wishlist";

const EMPTY_ADDRESS = {
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

const ADDRESS_FIELD_LABELS: Record<keyof typeof EMPTY_ADDRESS, string> = {
  label: "Label",
  fullName: "Full name",
  phone: "Phone",
  line1: "Address line 1",
  line2: "Address line 2",
  city: "City",
  state: "State",
  postalCode: "Pincode",
  country: "Country",
  isDefault: "Default",
};

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderThumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <span className="relative block h-16 w-16 overflow-hidden rounded-md bg-neutral-100">
      {src ? (
        <StorefrontImage src={src} alt={alt} className="object-cover" sizes="64px" />
      ) : (
        <span className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-neutral-400">
          No image
        </span>
      )}
    </span>
  );
}

function parseTab(value: string | null): Tab {
  if (value === "orders" || value === "addresses" || value === "profile" || value === "preferences" || value === "wishlist") {
    return value;
  }
  return "orders";
}

const lockedFieldClass =
  "w-full rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-800 disabled:cursor-default";

const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-accent-500/30";

export default function AccountPage() {
  return (
    <Suspense fallback={<CommerceSkeleton className="mx-auto max-w-3xl px-4 py-12" rows={2} />}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [newsletter, setNewsletter] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [smsMarketing, setSmsMarketing] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [editingProfile, setEditingProfile] = useState<null | "personal" | "email" | "phone">(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  async function loadAccount() {
    const [userProfile, userAddresses, userOrders, prefs] = await Promise.all([
      apiFetch<UserProfile>("/me"),
      apiFetch<CustomerAddress[]>("/me/addresses"),
      apiFetch<CustomerOrderSummary[]>("/me/orders"),
      apiFetch<NotificationPreferences>("/me/notification-preferences").catch(() => null),
    ]);
    setProfile(userProfile);
    const profilePrefs = userProfile.profile.preferences;
    const nameParts = (userProfile.displayName ?? "").trim().split(/\s+/).filter(Boolean);
    setFirstName(profilePrefs.firstName ?? nameParts[0] ?? "");
    setLastName(profilePrefs.lastName ?? nameParts.slice(1).join(" "));
    setGender(profilePrefs.gender === "male" || profilePrefs.gender === "female" ? profilePrefs.gender : "");
    setProfileEmail(userProfile.email ?? "");
    setProfilePhone((userProfile.phone ?? "").replace(/\D/g, "").slice(-10));
    setNewsletter(Boolean(profilePrefs.newsletter));
    setAddresses(userAddresses);
    setOrders(userOrders);
    setPreferences(prefs);
    setEmailMarketing(prefs?.emailMarketing ?? false);
    setSmsMarketing(prefs?.smsMarketing ?? false);
    setLoggedIn(true);
    void loadWishlist();
  }

  async function loadWishlist() {
    const sessionId = getSessionId();
    const response = await fetch(`${getApiUrl()}/wishlist?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: await authHeaders(),
    });
    const body = (await response.json()) as { success?: boolean; data?: WishlistItem[] };
    if (body.success && body.data) setWishlist(body.data);
  }

  function redirectAfterLogin() {
    const redirectTo = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
    if (redirectTo) router.replace(redirectTo);
  }

  const tab = parseTab(searchParams.get("tab"));

  function selectTab(next: Tab) {
    router.replace(`/account?tab=${next}`, { scroll: false });
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!hasSession()) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        await loadAccount();
        if (!cancelled) redirectAfterLogin();
      } catch {
        clearSession();
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on mount / next change
  }, [nextPath]);

  useEffect(() => {
    const onAuth = () => {
      if (hasSession()) return;
      setLoggedIn(false);
      setProfile(null);
      setAddresses([]);
      setOrders([]);
      setPreferences(null);
      setEmailMarketing(false);
      setSmsMarketing(false);
    };
    window.addEventListener("auth-changed", onAuth);
    return () => window.removeEventListener("auth-changed", onAuth);
  }, []);

  async function requestOtp() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ channel: "email", destination: email }),
      });
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    try {
      const tokens = await apiFetch<{ accessToken: string }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ channel: "email", destination: email, code }),
      });
      setSession(tokens.accessToken);
      await mergeCartOnLogin();
      await loadAccount();
      setStep("request");
      setCode("");
      redirectAfterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfileSection(section: "personal" | "email" | "phone") {
    setLoading(true);
    setError(null);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const updated = await apiFetch<UserProfile>("/me", {
        method: "PATCH",
        body: JSON.stringify(
          section === "personal"
            ? {
                ...(displayName ? { displayName } : {}),
                preferences: {
                  newsletter,
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  ...(gender ? { gender } : {}),
                },
              }
            : section === "email"
              ? { email: profileEmail.trim() }
              : { phone: profilePhone },
        ),
      });
      setProfile(updated);
      setEditingProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    setLoading(true);
    setError(null);
    try {
      const body: PatchNotificationPreferences = { emailMarketing, smsMarketing };
      const updated = await apiFetch<NotificationPreferences>("/me/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setPreferences(updated);
      setEmailMarketing(updated.emailMarketing);
      setSmsMarketing(updated.smsMarketing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notification preferences");
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...addressForm,
        line2: addressForm.line2.trim() || undefined,
      };
      if (editingAddressId) {
        const updated = await apiFetch<CustomerAddress>(`/me/addresses/${editingAddressId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setAddresses((prev) => prev.map((address) => (address.id === updated.id ? updated : address)));
      } else {
        const created = await apiFetch<CustomerAddress>("/me/addresses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setAddresses((prev) => [created, ...prev]);
      }
      setAddressForm(EMPTY_ADDRESS);
      setShowAddressForm(false);
      setEditingAddressId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setLoading(false);
    }
  }

  function beginEditAddress(address: CustomerAddress) {
    setEditingAddressId(address.id);
    setShowAddressForm(true);
    setAddressForm({
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

  async function deleteAddress(addressId: string) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/me/addresses/${addressId}`, { method: "DELETE" });
      setAddresses((prev) => prev.filter((address) => address.id !== addressId));
      if (editingAddressId === addressId) {
        setEditingAddressId(null);
        setShowAddressForm(false);
        setAddressForm(EMPTY_ADDRESS);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete address");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function removeWishlistItem(id: string) {
    const sessionId = getSessionId();
    await fetch(`${getApiUrl()}/wishlist/items/${id}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    setWishlist((prev) => prev.filter((item) => item.id !== id));
  }

  async function moveWishlistItem(id: string) {
    try {
      await moveWishlistToCart(id);
      setWishlist((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new Event("cart-updated"));
      router.push("/cart");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move to cart");
    }
  }

  if (!ready) {
    return <CommerceSkeleton className="mx-auto max-w-5xl px-4 py-12" rows={3} />;
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {nextPath === "/checkout" && (
              <p className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-neutral-800">
                Sign in to place your order. Your bag will stay saved.
              </p>
            )}
            {process.env.NODE_ENV === "development" ? (
              <p className="text-sm text-neutral-500">
                Development OTP: <code className="rounded bg-neutral-100 px-1">123456</code> for{" "}
                <code className="rounded bg-neutral-100 px-1">customer@ecom.local</code>.
              </p>
            ) : null}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step === "verify"}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            {step === "verify" && (
              <input
                type="text"
                placeholder="6-digit OTP"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            )}
            {error && <p className="text-sm text-danger-600">{error}</p>}
            {step === "request" ? (
              <Button className="bg-accent-500 text-neutral-950 hover:bg-accent-600" onClick={() => void requestOtp()} disabled={loading}>
                {loading ? "Sending…" : "Send OTP"}
              </Button>
            ) : (
              <Button className="bg-accent-500 text-neutral-950 hover:bg-accent-600" onClick={() => void verifyOtp()} disabled={loading}>
                {loading ? "Verifying…" : "Verify & Sign In"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">My Account</h1>
        <p className="mt-1 text-sm text-neutral-500">{profile?.email}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <AccountSidebar tab={tab} onSelect={selectTab} onSignOut={() => void handleSignOut()} />

        <div>

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

      {tab === "orders" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your orders</h2>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-neutral-500">
                <p>No orders yet.</p>
                <Link
                  href="/men"
                  className="mt-4 inline-flex rounded-md bg-accent-500 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
                >
                  Continue shopping
                </Link>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const status = orderStatusMeta(order.status);
              return (
              <article key={order.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex shrink-0 gap-2">
                      {(order.previews ?? []).length > 0 ? (
                        (order.previews ?? []).map((item, index) => (
                          <OrderThumb key={`${order.id}-${index}`} src={item.imageUrl} alt={item.title} />
                        ))
                      ) : (
                        <OrderThumb src={null} alt="" />
                      )}
                      {order.itemCount > (order.previews ?? []).length && (
                        <span className="flex h-16 items-center text-xs font-semibold text-neutral-500">
                          +{order.itemCount - (order.previews ?? []).length}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 text-sm">
                    <p className="font-semibold text-neutral-950">Order {order.orderNumber}</p>
                    <p className="mt-1 text-neutral-500">
                      {formatOrderDate(order.createdAt)} · {order.itemCount} item
                      {order.itemCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.badgeClassName}`}>
                        {status.label}
                      </span>
                      {order.paymentStatus ? (
                        <span className="text-xs capitalize text-neutral-500">Payment {order.paymentStatus}</span>
                      ) : null}
                    </p>
                  </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="text-base font-bold">{formatInr(order.total)}</p>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </article>
              );
            })
          )}
        </div>
      )}

      {tab === "profile" && (
        <div className="space-y-8 rounded-xl border border-neutral-200 bg-white p-5">
          <section>
            <ProfileHeading
              title="Personal information"
              editing={editingProfile === "personal"}
              onEdit={() => setEditingProfile("personal")}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={firstName}
                disabled={editingProfile !== "personal"}
                onChange={(event) => setFirstName(event.target.value)}
                aria-label="First name"
                className={editingProfile === "personal" ? inputClass : lockedFieldClass}
              />
              <input
                value={lastName}
                disabled={editingProfile !== "personal"}
                onChange={(event) => setLastName(event.target.value)}
                aria-label="Last name"
                className={editingProfile === "personal" ? inputClass : lockedFieldClass}
              />
            </div>
            <p className="mb-2 mt-4 text-sm text-neutral-700">Your gender</p>
            <div className="flex gap-6 text-sm">
              {(["male", "female"] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 capitalize">
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === option}
                    disabled={editingProfile !== "personal"}
                    onChange={() => setGender(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
            {editingProfile === "personal" && (
              <Button className="mt-4 bg-accent-500 text-neutral-950 hover:bg-accent-600" disabled={loading} onClick={() => void saveProfileSection("personal")}>
                {loading ? "Saving…" : "Save"}
              </Button>
            )}
          </section>

          <section>
            <ProfileHeading
              title="Email address"
              editing={editingProfile === "email"}
              onEdit={() => setEditingProfile("email")}
            />
            <input
              type="email"
              value={profileEmail}
              disabled={editingProfile !== "email"}
              onChange={(event) => setProfileEmail(event.target.value)}
              aria-label="Email address"
              className={`mt-4 max-w-sm ${editingProfile === "email" ? inputClass : lockedFieldClass}`}
            />
            {editingProfile === "email" && (
              <Button className="mt-4 bg-accent-500 text-neutral-950 hover:bg-accent-600" disabled={loading} onClick={() => void saveProfileSection("email")}>
                {loading ? "Saving…" : "Save"}
              </Button>
            )}
          </section>

          <section>
            <ProfileHeading
              title="Mobile number"
              editing={editingProfile === "phone"}
              onEdit={() => setEditingProfile("phone")}
            />
            <input
              inputMode="numeric"
              maxLength={editingProfile === "phone" ? 10 : 13}
              value={editingProfile === "phone" ? profilePhone : profilePhone ? `+91${profilePhone}` : ""}
              disabled={editingProfile !== "phone"}
              onChange={(event) => setProfilePhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              aria-label="Mobile number"
              placeholder="10-digit mobile"
              className={`mt-4 max-w-sm ${editingProfile === "phone" ? inputClass : lockedFieldClass}`}
            />
            {editingProfile === "phone" && (
              <Button className="mt-4 bg-accent-500 text-neutral-950 hover:bg-accent-600" disabled={loading} onClick={() => void saveProfileSection("phone")}>
                {loading ? "Saving…" : "Save"}
              </Button>
            )}
          </section>
        </div>
      )}

      {tab === "preferences" && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-neutral-500">
              Transactional messages stay on so you receive order updates and security codes.
            </p>
            <NotificationPreferenceRow
              label="Transactional email"
              description="Order confirmations, shipping updates, and account security."
              checked={preferences?.emailTransactional ?? true}
              disabled
            />
            <NotificationPreferenceRow
              label="Transactional SMS"
              description="One-time passwords and time-sensitive order alerts."
              checked={preferences?.smsTransactional ?? true}
              disabled
            />
            <NotificationPreferenceRow
              label="Marketing email"
              description="Promotions, product recommendations, and campaigns."
              checked={emailMarketing}
              onChange={setEmailMarketing}
            />
            <NotificationPreferenceRow
              label="Marketing SMS"
              description="Sale alerts and promotional offers by text message."
              checked={smsMarketing}
              onChange={setSmsMarketing}
            />
            {preferences?.unsubscribedAt ? (
              <p className="text-sm text-neutral-500">
                Unsubscribed {new Date(preferences.unsubscribedAt).toLocaleDateString("en-IN")}.
              </p>
            ) : null}
            <Button className="bg-accent-500 text-neutral-950 hover:bg-accent-600" onClick={() => void savePreferences()} disabled={loading}>
              {loading ? "Saving…" : "Save preferences"}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "addresses" && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Saved addresses</h2>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddressForm((open) => !open);
                setEditingAddressId(null);
                setAddressForm(EMPTY_ADDRESS);
              }}
            >
              {showAddressForm ? (
                "Cancel"
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <PlusIcon />
                  Add address
                </span>
              )}
            </Button>
          </div>

          {showAddressForm && (
            <Card>
              <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                {(
                  ["fullName", "phone", "line1", "line2", "city", "state", "postalCode"] as const
                ).map((field) => (
                  <label key={field} className="text-sm sm:col-span-1">
                    {ADDRESS_FIELD_LABELS[field]}
                    <input
                      value={addressForm[field]}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  />
                  Set as default
                </label>
                <Button className="bg-accent-500 text-neutral-950 hover:bg-accent-600" onClick={() => void saveAddress()} disabled={loading}>
                  {editingAddressId ? "Save changes" : "Save address"}
                </Button>
              </CardContent>
            </Card>
          )}

          {addresses.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No addresses saved yet. Add one here, or enter an address at checkout while logged in.
            </p>
          ) : (
            addresses.map((address) => (
              <Card key={address.id}>
                <CardContent className="pt-6 text-sm">
                  <p className="font-medium">
                    {address.fullName}{" "}
                    {address.isDefault && (
                      <span className="ml-2 rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
                        Default
                      </span>
                    )}
                  </p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p className="mt-2 flex items-center gap-1.5 text-neutral-600">
                    <PinIcon />
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-neutral-600">
                    <PhoneIcon />
                    {address.phone}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50"
                      onClick={() => beginEditAddress(address)}
                    >
                      <PencilIcon />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border border-danger-200 px-3 py-1.5 text-xs font-semibold text-danger-600 hover:bg-danger-50"
                      onClick={() => setAddressToDelete(address)}
                    >
                      <TrashIcon />
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "wishlist" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Wishlist</h2>
          {wishlist.length === 0 ? (
            <p className="text-sm text-neutral-500">Your wishlist is empty.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {wishlist.map((item) => (
                <div key={item.id} className="space-y-2">
                  {item.product ? (
                    <Link href={`/products/${item.productSlug}`}>
                      <ProductCard product={item.product} showStatus={false} />
                    </Link>
                  ) : (
                    <p className="text-sm">{item.productSlug}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => void moveWishlistItem(item.id)}>
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <BagIcon />
                        Move to cart
                      </span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void removeWishlistItem(item.id)}>
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <TrashIcon />
                        Remove
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <StorefrontRecommendationRail slot="recently_viewed" title="Recently viewed" className="px-0" />
        </div>
      </div>
      {addressToDelete ? (
        <Dialog
          open
          onClose={() => {
            if (!loading) setAddressToDelete(null);
          }}
          title="Remove address"
          description="This address will be removed from your account."
        >
          <div className="mb-5 flex gap-3 rounded-xl border border-neutral-200 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <PinIcon />
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-neutral-950">{addressToDelete.fullName}</p>
              <p className="text-neutral-600">{addressToDelete.line1}</p>
              {addressToDelete.line2 ? <p className="text-neutral-600">{addressToDelete.line2}</p> : null}
              <p className="text-neutral-600">
                {addressToDelete.city}, {addressToDelete.state} {addressToDelete.postalCode}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => setAddressToDelete(null)}
              className="rounded-xl border border-neutral-300 py-3 text-sm font-bold uppercase tracking-wide hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                void deleteAddress(addressToDelete.id).then((removed) => {
                  if (removed) setAddressToDelete(null);
                });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger-600 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-danger-500 disabled:opacity-50"
            >
              <TrashIcon />
              {loading ? "Removing…" : "Delete"}
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function ProfileHeading({
  title,
  editing,
  onEdit,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
      {!editing ? (
        <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-info-700 hover:underline" onClick={onEdit}>
          <PencilIcon />
          Edit
        </button>
      ) : null}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.1l-1.9-1.9a1.5 1.5 0 0 0-2.1 0L4 16v4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m12.5 6.5 3 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3.5h3l1.2 3.2-1.8 1.1a12 12 0 0 0 5.8 5.8l1.1-1.8 3.2 1.2v3A1.5 1.5 0 0 1 19 17.5 16 16 0 0 1 6.5 5 1.5 1.5 0 0 1 8 3.5Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h12l-1 12H7L6 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a3 3 0 1 1 6 0v2" />
    </svg>
  );
}
