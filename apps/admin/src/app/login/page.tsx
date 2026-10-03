"use client";

import type { UserProfile } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useState } from "react";

import { POST_LOGIN_PATH } from "@/components/layout/admin-nav";
import { apiFetch, logout, setSession } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    const destination = email.trim().toLowerCase();
    if (!destination) {
      setError("Enter your admin email address");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ channel: "email", destination }),
      });
      setEmail(destination);
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
        body: JSON.stringify({ channel: "email", destination: email.trim().toLowerCase(), code: code.trim() }),
      });
      setSession(tokens.accessToken);
      const profile = await apiFetch<UserProfile>("/me");
      if ((profile.permissions ?? []).length === 0) {
        await logout();
        throw new Error("This account does not have permission to access the admin app.");
      }
      window.location.replace(POST_LOGIN_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {process.env.NODE_ENV === "development" ? (
            <>
              <p className="text-sm text-neutral-500">
                Development OTP: <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">123456</code>.
              </p>
              <ul className="text-xs text-neutral-500">
                <li>admin@ecom.local — full admin</li>
                <li>catalog@ecom.local — catalog manager</li>
              </ul>
            </>
          ) : null}
          <label className="text-sm font-medium" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={step === "verify"}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          {step === "verify" && (
            <>
              <label className="text-sm font-medium" htmlFor="admin-otp">
                One-time code
              </label>
              <input
                id="admin-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit OTP"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </>
          )}
          {error && <p className="text-sm text-danger-600">{error}</p>}
          {step === "request" ? (
            <Button onClick={() => void requestOtp()} disabled={loading}>
              {loading ? "Sending…" : "Send OTP"}
            </Button>
          ) : (
            <Button onClick={() => void verifyOtp()} disabled={loading}>
              {loading ? "Verifying…" : "Verify & Login"}
            </Button>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
