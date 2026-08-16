"use client";

import type { OrderConfirmation } from "@ecom/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { formatInr } from "@/lib/cart";
import { fetchOrder } from "@/lib/payments";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) {
      setError("Missing order reference");
      setLoading(false);
      return;
    }
    void fetchOrder(orderNumber)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load order"))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-neutral-500">Confirming your order…</div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold">Order not found</h1>
        <p className="mt-2 text-neutral-500">{error}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-info-600 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h1 className="text-2xl font-display font-bold">Order confirmed</h1>
      <p className="mt-2 text-neutral-500">{order.message}</p>

      <div className="mt-8 rounded-xl border border-neutral-200 p-5 text-left dark:border-neutral-800">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Order number</dt>
            <dd className="font-semibold">{order.orderNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Payment</dt>
            <dd className="font-medium uppercase">{order.paymentMethod}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Items</dt>
            <dd>{order.itemCount}</dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-bold dark:border-neutral-800">
            <dt>Total</dt>
            <dd>{formatInr(order.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/men"
          className="rounded-md bg-accent-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
        >
          Continue Shopping
        </Link>
        <Link
          href="/account"
          className="rounded-md border border-neutral-300 px-6 py-3 text-sm font-bold uppercase tracking-wide hover:bg-neutral-50 dark:border-neutral-700"
        >
          My Account
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16 text-neutral-500">Loading…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
