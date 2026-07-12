"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useState } from "react";

import { apiFetch, setToken } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@ecom.local");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setToken(tokens.accessToken);
      window.location.href = "/products";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            Use OTP login with the dev admin account. Check API logs for the OTP code.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={step === "verify"}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          {step === "verify" && (
            <input
              type="text"
              placeholder="6-digit OTP"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
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
  );
}
