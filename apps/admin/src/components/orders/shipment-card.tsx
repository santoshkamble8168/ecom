"use client";

import type { ShipmentStatus, ShipmentSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";

import { ShipmentStatusBadge } from "./status-badges";

const SHIPMENT_EVENT_STATUSES: ShipmentStatus[] = [
  "pending",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
];

export function ShipmentCard({ shipment, orderId }: { shipment: ShipmentSummary; orderId: string }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ShipmentStatus>("in_transit");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addEventMutation = useMutation({
    mutationFn: () =>
      apiFetch<ShipmentSummary>(`/admin/shipments/${shipment.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          status,
          description,
          location: location || undefined,
        }),
      }),
    onSuccess: () => {
      setError(null);
      setDescription("");
      setLocation("");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{shipment.shipmentNumber}</p>
          <p className="text-sm text-neutral-500">
            {shipment.courierName ?? "Courier not set"}
            {shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ""}
          </p>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-neutral-500 sm:grid-cols-3">
        <p>Estimated delivery: {formatDate(shipment.estimatedDeliveryAt)}</p>
        <p>Shipped at: {formatDate(shipment.shippedAt)}</p>
        <p>Delivered at: {formatDate(shipment.deliveredAt)}</p>
      </div>

      {shipment.events.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-l border-neutral-200 pl-3 text-sm dark:border-neutral-700">
          {shipment.events.map((event, idx) => (
            <li key={`${shipment.id}-${idx}`}>
              <span className="font-medium">{event.description}</span>{" "}
              <span className="text-neutral-500">
                ({event.status}
                {event.location ? `, ${event.location}` : ""}) · {formatDateTime(event.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addEventMutation.mutate();
        }}
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {SHIPMENT_EVENT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="min-w-[180px] flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="text"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={addEventMutation.isPending}>
          {addEventMutation.isPending ? "Adding…" : "Add event"}
        </Button>
      </form>
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
