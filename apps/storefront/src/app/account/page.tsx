"use client";

import type {
  CustomerAddress,
  CustomerOrderSummary,
  NotificationPreferences,
  PatchNotificationPreferences,
  UserProfile,
} from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle, NotificationPreferenceRow } from "@ecom/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { apiFetch, clearToken, getRefreshToken, getToken, setTokens } from "@/lib/auth";
import { formatInr, mergeCartOnLogin } from "@/lib/cart";
import { orderStatusMeta } from "@/lib/orders";
import { StorefrontRecommendationRail } from "@/components/recommendations/recommendation-rail";

type Tab = "orders" | "profile" | "addresses" | "preferences";

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

function orderStatusLabel(status: CustomerOrderSummary["status"]): string {
  return orderStatusMeta(status).label;
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12 text-neutral-500">Loading account…</div>}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [email, setEmail] = useState("customer@ecom.local");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("orders");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [smsMarketing, setSmsMarketing] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [showAddressForm, setShowAddressForm] = useState(false);

  async function loadAccount() {
    const [userProfile, userAddresses, userOrders, prefs] = await Promise.all([
      apiFetch<UserProfile>("/me"),
      apiFetch<CustomerAddress[]>("/me/addresses"),
      apiFetch<CustomerOrderSummary[]>("/me/orders"),
      apiFetch<NotificationPreferences>("/me/notification-preferences").catch(() => null),
    ]);
    setProfile(userProfile);
    setDisplayName(userProfile.displayName ?? "");
    setNewsletter(Boolean(userProfile.profile.preferences.newsletter));
    setAddresses(userAddresses);
    setOrders(userOrders);
    setPreferences(prefs);
    setEmailMarketing(prefs?.emailMarketing ?? false);
    setSmsMarketing(prefs?.smsMarketing ?? false);
    setLoggedIn(true);
  }

  function redirectAfterLogin() {
    const redirectTo = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
    if (redirectTo) router.replace(redirectTo);
  }

  useEffect(() => {
    if (getToken()) {
      void loadAccount()
        .then(() => redirectAfterLogin())
        .catch(() => clearToken());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on mount / next change
  }, [nextPath]);

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
      const tokens = await apiFetch<{ accessToken: string; refreshToken: string }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ channel: "email", destination: email, code }),
      });
      setTokens(tokens.accessToken, tokens.refreshToken);
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

  async function saveProfile() {
    setLoading(true);
    setError(null);
    try {
      const updated = await apiFetch<UserProfile>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName,
          preferences: { newsletter },
        }),
      });
      setProfile(updated);
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
      const created = await apiFetch<CustomerAddress>("/me/addresses", {
        method: "POST",
        body: JSON.stringify(addressForm),
      });
      setAddresses((prev) => [created, ...prev]);
      setAddressForm(EMPTY_ADDRESS);
      setShowAddressForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    const token = getToken();
    if (refreshToken && token) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Best-effort
      }
    }
    clearToken();
    setLoggedIn(false);
    setProfile(null);
    setAddresses([]);
    setOrders([]);
    setPreferences(null);
    setEmailMarketing(false);
    setSmsMarketing(false);
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
            <p className="text-sm text-neutral-500">
              OTP login. In development, use <code className="rounded bg-neutral-100 px-1">123456</code> for{" "}
              <code className="rounded bg-neutral-100 px-1">customer@ecom.local</code>.
            </p>
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
              <Button onClick={() => void requestOtp()} disabled={loading}>
                {loading ? "Sending…" : "Send OTP"}
              </Button>
            ) : (
              <Button onClick={() => void verifyOtp()} disabled={loading}>
                {loading ? "Verifying…" : "Verify & Sign In"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "orders", label: "Orders" },
    { id: "addresses", label: "Addresses" },
    { id: "profile", label: "Profile" },
    { id: "preferences", label: "Notifications" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">My Account</h1>
          <p className="text-sm text-neutral-500">{profile?.email}</p>
        </div>
        <Button variant="outline" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-md px-4 py-2 text-sm ${
              tab === item.id ? "bg-brand-700 text-white" : "border border-neutral-300"
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

      {tab === "orders" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your orders</h2>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-neutral-500">
                <p>No orders yet.</p>
                <Link href="/" className="mt-3 inline-block text-info-600 hover:underline">
                  Continue shopping
                </Link>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <p className="font-semibold text-neutral-900">
                      Order {order.orderNumber}
                    </p>
                    <p className="mt-1 text-neutral-500">
                      {formatOrderDate(order.createdAt)} · {order.itemCount} item
                      {order.itemCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1">
                      <span className={orderStatusMeta(order.status).textClassName}>
                        {orderStatusLabel(order.status)}
                      </span>
                      {order.paymentStatus ? (
                        <span className="text-neutral-400"> · Payment {order.paymentStatus}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-base font-bold">{formatInr(order.total)}</p>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="text-sm font-medium text-info-600 hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="text-sm">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
              />
              Subscribe to newsletter
            </label>
            <Button onClick={() => void saveProfile()} disabled={loading}>
              {loading ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>
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
            <Button onClick={() => void savePreferences()} disabled={loading}>
              {loading ? "Saving…" : "Save preferences"}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "addresses" && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Saved addresses</h2>
            <Button variant="outline" onClick={() => setShowAddressForm((v) => !v)}>
              {showAddressForm ? "Cancel" : "Add address"}
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
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
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
                <Button onClick={() => void saveAddress()} disabled={loading}>
                  Save address
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
                    {address.isDefault && <span className="text-brand-700">(Default)</span>}
                  </p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p>{address.phone}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <StorefrontRecommendationRail slot="recently_viewed" title="Recently viewed" className="px-0" />
    </div>
  );
}
