"use client";

import type { CartLineItem, ShipmentSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

interface AdminCourier {
  id: string;
  code: string;
  name: string;
}

export function CreateShipmentForm({ orderId, items }: { orderId: string; items: CartLineItem[] }) {
  const queryClient = useQueryClient();
  const [courierCode, setCourierCode] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.variantSku, item.quantity])),
  );
  const [error, setError] = useState<string | null>(null);

  const { data: couriers } = useQuery({
    queryKey: ["admin-couriers"],
    queryFn: () => apiFetch<AdminCourier[]>("/admin/couriers"),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const shipmentItems = items
        .map((item) => ({ variantSku: item.variantSku, quantity: quantities[item.variantSku] ?? 0 }))
        .filter((item) => item.quantity > 0);

      return apiFetch<ShipmentSummary>(`/admin/orders/${orderId}/shipments`, {
        method: "POST",
        body: JSON.stringify({
          courierCode: courierCode || undefined,
          trackingNumber: trackingNumber || undefined,
          estimatedDeliveryAt: estimatedDeliveryAt || undefined,
          items: shipmentItems,
        }),
      });
    },
    onSuccess: () => {
      setError(null);
      setTrackingNumber("");
      setEstimatedDeliveryAt("");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const hasSelectedItems = items.some((item) => (quantities[item.variantSku] ?? 0) > 0);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        createMutation.mutate();
      }}
    >
      <div className="flex flex-wrap gap-3">
        <select
          value={courierCode}
          onChange={(e) => setCourierCode(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Select courier (optional)</option>
          {couriers?.map((courier) => (
            <option key={courier.id} value={courier.code}>
              {courier.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Tracking number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="date"
          value={estimatedDeliveryAt}
          onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-left font-medium">Purchased</th>
              <th className="px-3 py-2 text-left font-medium">Ship qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-3 py-2">{item.product?.title ?? item.variantLabel ?? item.variantSku}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.variantSku}</td>
                <td className="px-3 py-2">{item.quantity}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={quantities[item.variantSku] ?? 0}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.variantSku]: Math.max(0, Math.min(item.quantity, Number(e.target.value))),
                      }))
                    }
                    className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <Button type="submit" size="sm" disabled={!hasSelectedItems || createMutation.isPending}>
          {createMutation.isPending ? "Creating shipment…" : "Create shipment"}
        </Button>
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
    </form>
  );
}
