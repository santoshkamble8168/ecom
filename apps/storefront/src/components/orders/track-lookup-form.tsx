"use client";

import { Button } from "@ecom/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrackLookupForm() {
  const router = useRouter();
  const [shipment, setShipment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = shipment.trim();
    if (value.length < 4) {
      setError("Enter a shipment number (at least 4 characters).");
      return;
    }
    setError(null);
    router.push(`/track/${encodeURIComponent(value)}`);
  }

  return (
    <form className="mt-8 flex max-w-md flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <label htmlFor="shipment-number" className="text-sm font-medium">
        Shipment number
      </label>
      <input
        id="shipment-number"
        value={shipment}
        onChange={(event) => setShipment(event.target.value)}
        aria-invalid={Boolean(error)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        placeholder="e.g. SHP-1001"
      />
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <Button type="submit" className="min-h-11 w-fit bg-accent-500 text-neutral-950 hover:bg-accent-600">
        Track shipment
      </Button>
    </form>
  );
}
