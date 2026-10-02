"use client";

import { Button, Dialog } from "@ecom/ui";
import { useState } from "react";

import { apiFetch, setSession } from "@/lib/auth";
import { mergeCartOnLogin } from "@/lib/cart";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("customer@ecom.local");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep("request");
    setCode("");
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

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
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Sign in"
      description="Sign in to continue to checkout. Your bag will stay saved."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "request") void requestOtp();
          else void verifyOtp();
        }}
      >
        <p className="text-sm text-neutral-500">
          OTP login. In development, use <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">123456</code>{" "}
          for <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">customer@ecom.local</code>.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === "verify" || loading}
          required
          autoComplete="email"
          aria-label="Email"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {step === "verify" && (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit OTP"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            required
            aria-label="One-time code"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
        {error && <p className="text-sm text-danger-600">{error}</p>}
        {step === "request" ? (
          <Button type="submit" disabled={loading || !email.trim()}>
            {loading ? "Sending…" : "Send OTP"}
          </Button>
        ) : (
          <Button type="submit" disabled={loading || code.trim().length === 0}>
            {loading ? "Verifying…" : "Verify & continue"}
          </Button>
        )}
      </form>
    </Dialog>
  );
}
