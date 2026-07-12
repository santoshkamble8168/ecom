"use client";

import { Button } from "@ecom/ui";
import { useState } from "react";

export function NewsletterForm({
  placeholder,
  ctaLabel,
}: {
  placeholder: string;
  ctaLabel: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/newsletter/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
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
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          className="flex-1 rounded-md bg-white px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="bg-accent-600 text-white hover:bg-accent-700"
        >
          {status === "loading" ? "..." : ctaLabel}
        </Button>
      </form>
      {message && (
        <p className={`mt-2 text-sm ${status === "error" ? "text-red-300" : "text-accent-300"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
