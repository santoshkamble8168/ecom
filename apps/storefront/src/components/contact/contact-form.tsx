"use client";

import { Button } from "@ecom/ui";
import { useState } from "react";

import { getApiUrl } from "@/lib/api-url";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter your name (at least 2 characters).";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
    if (message.trim().length < 10) next.message = "Tell us a bit more (at least 10 characters).";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    setServerMessage("");
    try {
      const res = await fetch(`${getApiUrl()}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), website }),
      });
      const body = await res.json();
      if (body.success) {
        setStatus("success");
        setServerMessage("Thanks — we received your message.");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
        setServerMessage(body.error?.message ?? "Could not send your message.");
      }
    } catch {
      setStatus("error");
      setServerMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <form className="mt-8 flex max-w-lg flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {fieldErrors.name && <p className="mt-1 text-sm text-danger-600">{fieldErrors.name}</p>}
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {fieldErrors.email && <p className="mt-1 text-sm text-danger-600">{fieldErrors.email}</p>}
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={Boolean(fieldErrors.message)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {fieldErrors.message && <p className="mt-1 text-sm text-danger-600">{fieldErrors.message}</p>}
      </div>
      <Button type="submit" disabled={status === "loading"} className="min-h-11 w-fit bg-accent-500 text-neutral-950 hover:bg-accent-600">
        {status === "loading" ? "Sending…" : "Send message"}
      </Button>
      {serverMessage && (
        <p className={`text-sm ${status === "error" ? "text-danger-600" : "text-success-700"}`}>{serverMessage}</p>
      )}
    </form>
  );
}
