"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CONSENT_CHANGED_EVENT, readCookieConsent, writeCookieConsent, type CookieConsent } from "@/lib/consent";

export function CookieConsentBanner() {
  const [choice, setChoice] = useState<CookieConsent | null | "pending">("pending");

  useEffect(() => {
    const sync = () => setChoice(readCookieConsent());
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  if (choice === "pending" || choice !== null) return null;

  return (
    <aside
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-neutral-700 bg-neutral-950 p-4 text-neutral-50 shadow-lg"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p id="cookie-consent-title" className="text-sm font-semibold">
            Cookies and analytics
          </p>
          <p className="mt-1 text-sm text-neutral-200">
            We use essential cookies to run checkout and optional analytics cookies to improve the
            store. Read our{" "}
            <Link href="/privacy" className="font-semibold text-white underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md border border-neutral-500 px-4 text-sm font-semibold text-white hover:bg-neutral-800"
            onClick={() => writeCookieConsent("rejected")}
          >
            Reject optional
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md bg-accent-500 px-4 text-sm font-bold text-neutral-950 hover:bg-accent-600"
            onClick={() => writeCookieConsent("accepted")}
          >
            Accept all
          </button>
        </div>
      </div>
    </aside>
  );
}
