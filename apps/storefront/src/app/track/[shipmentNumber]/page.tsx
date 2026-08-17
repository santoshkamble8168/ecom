"use client";

import type { TrackingEventSummary } from "@ecom/types";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { fetchTracking, type TrackingResult } from "@/lib/orders";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TrackingTimeline({ events }: { events: TrackingEventSummary[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No tracking updates yet.</p>;
  }
  return (
    <ol className="space-y-4 border-l border-neutral-200 pl-4 dark:border-neutral-800">
      {events.map((event, idx) => (
        <li key={`${event.status}-${event.occurredAt}-${idx}`} className="text-sm">
          <p className="font-medium capitalize text-neutral-900 dark:text-neutral-100">
            {event.status.replace(/_/g, " ")}
          </p>
          <p className="text-neutral-500">{event.description}</p>
          <p className="text-xs text-neutral-400">
            {formatDateTime(event.occurredAt)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function TrackShipmentPage() {
  const params = useParams<{ shipmentNumber: string }>();
  const shipmentNumber = Array.isArray(params.shipmentNumber) ? params.shipmentNumber[0] : params.shipmentNumber;

  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shipmentNumber) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTracking(shipmentNumber);
      setTracking(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find this shipment");
    } finally {
      setLoading(false);
    }
  }, [shipmentNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-neutral-500">Looking up your shipment…</div>;
  }

  if (error || !tracking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold">Shipment not found</h1>
        <p className="mt-2 text-neutral-500">
          {error ?? "We couldn't find a shipment with that tracking reference."}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-info-600 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-display font-bold">Track your shipment</h1>
      <p className="mt-1 text-sm text-neutral-500">Order {tracking.orderNumber}</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Shipment {tracking.shipmentNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline text-neutral-500">Status: </dt>
              <dd className="inline font-medium capitalize">{tracking.status.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">Courier: </dt>
              <dd className="inline font-medium">{tracking.courierName ?? "Not assigned yet"}</dd>
            </div>
            {tracking.trackingNumber && (
              <div>
                <dt className="inline text-neutral-500">Tracking number: </dt>
                <dd className="inline font-medium">
                  {tracking.trackingUrl ? (
                    <a
                      href={tracking.trackingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-info-600 hover:underline"
                    >
                      {tracking.trackingNumber}
                    </a>
                  ) : (
                    tracking.trackingNumber
                  )}
                </dd>
              </div>
            )}
            {tracking.estimatedDeliveryAt && (
              <div>
                <dt className="inline text-neutral-500">Estimated delivery: </dt>
                <dd className="inline font-medium">{formatDate(tracking.estimatedDeliveryAt)}</dd>
              </div>
            )}
            {tracking.shippedAt && (
              <div>
                <dt className="inline text-neutral-500">Shipped: </dt>
                <dd className="inline">{formatDate(tracking.shippedAt)}</dd>
              </div>
            )}
            {tracking.deliveredAt && (
              <div>
                <dt className="inline text-neutral-500">Delivered: </dt>
                <dd className="inline">{formatDate(tracking.deliveredAt)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Tracking history
            </h2>
            <TrackingTimeline events={tracking.events} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
