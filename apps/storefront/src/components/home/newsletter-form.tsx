"use client";

import { Button } from "@ecom/ui";
import { useState } from "react";

import { getApiUrl } from "@/lib/api-url";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({
  placeholder,
  ctaLabel,
}: {
  placeholder: string;
  ctaLabel: string;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(`${getApiUrl()}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website }),
      });
      const body = await res.json();
      if (body.success) {
        setStatus("success");
        setMessage("You're subscribed!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(body.error?.message ?? "Subscription failed");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div>
      <form
        className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="newsletter-website">Website</label>
          <input
            id="newsletter-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          aria-invalid={status === "error"}
          aria-label="Email address"
          className="min-h-11 flex-1 rounded-md bg-white px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-600 focus:outline-none"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="min-h-11 bg-accent-500 text-neutral-950 hover:bg-accent-600"
        >
          {status === "loading" ? "..." : ctaLabel}
        </Button>
      </form>
      {message && (
        <p className={`mt-2 text-sm ${status === "error" ? "text-danger-600" : "text-accent-300"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
