"use client";

import type { CustomerAddress, UserProfile } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useEffect, useState } from "react";

import { apiFetch, clearToken, getRefreshToken, getToken, setTokens } from "@/lib/auth";
import { mergeCartOnLogin } from "@/lib/cart";

type Tab = "profile" | "addresses";

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

export default function AccountPage() {
  const [email, setEmail] = useState("customer@ecom.local");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [showAddressForm, setShowAddressForm] = useState(false);

  async function loadAccount() {
    const [userProfile, userAddresses] = await Promise.all([
      apiFetch<UserProfile>("/me"),
      apiFetch<CustomerAddress[]>("/me/addresses"),
    ]);
    setProfile(userProfile);
    setDisplayName(userProfile.displayName ?? "");
    setNewsletter(Boolean(userProfile.profile.preferences.newsletter));
    setAddresses(userAddresses);
    setLoggedIn(true);
  }

  useEffect(() => {
    if (getToken()) {
      void loadAccount().catch(() => clearToken());
    }
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
      const tokens = await apiFetch<{ accessToken: string; refreshToken: string }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ channel: "email", destination: email, code }),
      });
      setTokens(tokens.accessToken, tokens.refreshToken);
      await mergeCartOnLogin();
      await loadAccount();
      setStep("request");
      setCode("");
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
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
            {error && <p className="text-sm text-red-600">{error}</p>}
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

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm ${tab === "profile" ? "bg-brand-700 text-white" : "border"}`}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm ${tab === "addresses" ? "bg-brand-700 text-white" : "border"}`}
          onClick={() => setTab("addresses")}
        >
          Addresses
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

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
                {(["fullName", "phone", "line1", "line2", "city", "state", "postalCode"] as const).map((field) => (
                  <label key={field} className="text-sm sm:col-span-1">
                    {field}
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
            <p className="text-sm text-neutral-500">No addresses saved yet.</p>
          ) : (
            addresses.map((address) => (
              <Card key={address.id}>
                <CardContent className="pt-6 text-sm">
                  <p className="font-medium">
                    {address.fullName} {address.isDefault && <span className="text-brand-700">(Default)</span>}
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
    </div>
  );
}
