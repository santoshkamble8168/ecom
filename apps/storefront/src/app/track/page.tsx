import type { Metadata } from "next";

import { TrackLookupForm } from "@/components/orders/track-lookup-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Look up an Ecom shipment with your tracking number.",
  alternates: { canonical: "/track" },
  robots: { index: false, follow: false },
};

export default function TrackLookupPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-display font-bold">Track your order</h1>
      <p className="mt-3 text-neutral-700 dark:text-neutral-300">
        Enter the shipment number from your shipping confirmation email.
      </p>
      <TrackLookupForm />
    </div>
  );
}
