"use client";

import type { AdminOrderDetail } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CreateShipmentForm } from "@/components/orders/create-shipment-form";
import { ExchangeCard } from "@/components/orders/exchange-card";
import { ReturnCard } from "@/components/orders/return-card";
import { ShipmentCard } from "@/components/orders/shipment-card";
import { OrderStatusBadge } from "@/components/orders/status-badges";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { AdminPageSkeleton } from "@/components/layout/admin-skeleton";

const ADMIN_SETTABLE_STATUSES = ["processing", "shipped", "delivered", "cancelled"] as const;
type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const queryClient = useQueryClient();

  const [newStatus, setNewStatus] = useState<AdminSettableStatus>("processing");
  const [statusNote, setStatusNote] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => apiFetch<AdminOrderDetail>(`/admin/orders/${orderId}`),
    enabled: Boolean(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      apiFetch<AdminOrderDetail>(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
      }),
    onSuccess: () => {
      setStatusError(null);
      setStatusNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    },
    onError: (err: Error) => setStatusError(err.message),
  });

  if (isLoading) {
    return <AdminPageSkeleton />;
  }

  if (isError || !order) {
    return (
      <p className="text-danger-600">
        {error instanceof Error ? error.message : "Failed to load order."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold">Order {order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-neutral-500">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <Link href="/orders" className="text-sm text-brand-600 hover:underline">
          ← Back to orders
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p className="font-medium">{order.customerName ?? "—"}</p>
            <p className="text-neutral-500">{order.customerEmail ?? "—"}</p>
            <p className="text-neutral-500">User ID: {order.userId ?? "—"}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-neutral-600 dark:text-neutral-400">
              <span>Total: {formatCurrency(order.total, order.currency)}</span>
              <span className="capitalize">Payment: {order.paymentMethod}</span>
              <span>Status: {order.paymentStatus ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{order.address.fullName}</p>
            <p>{order.address.phone}</p>
            <p>{order.address.line1}</p>
            {order.address.line2 && <p>{order.address.line2}</p>}
            <p>
              {order.address.city}, {order.address.state} {order.address.postalCode}
            </p>
            <p>{order.address.country}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-left font-medium">SKU</th>
                  <th className="px-3 py-2 text-left font-medium">Qty</th>
                  <th className="px-3 py-2 text-left font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-left font-medium">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.product?.title ?? "—"}</p>
                      <p className="text-neutral-500">{item.variantLabel}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{item.variantSku}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatCurrency(item.unitPrice, order.currency)}</td>
                    <td className="px-3 py-2">{formatCurrency(item.lineTotal, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {order.timeline.length === 0 ? (
              <p className="text-sm text-neutral-500">No status events yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {order.timeline.map((event, idx) => (
                  <li key={idx} className="border-l-2 border-neutral-200 pl-3 dark:border-neutral-700">
                    <p className="font-medium">
                      {event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : event.toStatus}
                    </p>
                    <p className="text-neutral-500">
                      {event.actorType} · {formatDateTime(event.createdAt)}
                    </p>
                    {event.reason && <p className="text-neutral-500">{event.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                statusMutation.mutate();
              }}
            >
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as AdminSettableStatus)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                {ADMIN_SETTABLE_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Note (optional)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <div>
                <Button type="submit" size="sm" disabled={statusMutation.isPending}>
                  {statusMutation.isPending ? "Updating…" : "Update status"}
                </Button>
              </div>
              {statusError && <p className="text-sm text-danger-600">{statusError}</p>}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {order.shipments.length === 0 && (
            <p className="text-sm text-neutral-500">No shipments created yet.</p>
          )}
          {order.shipments.map((shipment) => (
            <ShipmentCard key={shipment.id} shipment={shipment} orderId={order.id} />
          ))}

          <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="mb-2 text-sm font-medium">Create shipment</p>
            <CreateShipmentForm orderId={order.id} items={order.items} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Returns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {order.returnRequests.length === 0 ? (
            <p className="text-sm text-neutral-500">No return requests.</p>
          ) : (
            order.returnRequests.map((request) => (
              <ReturnCard key={request.id} request={request} orderId={order.id} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exchanges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {order.exchangeRequests.length === 0 ? (
            <p className="text-sm text-neutral-500">No exchange requests.</p>
          ) : (
            order.exchangeRequests.map((request) => (
              <ExchangeCard key={request.id} request={request} orderId={order.id} />
            ))
          )}
        </CardContent>
      </Card>

      {order.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
            <p>Invoice #{order.invoice.invoiceNumber}</p>
            <p>Issued {formatDate(order.invoice.issuedAt)}</p>
            <p>Total: {formatCurrency(order.invoice.total, order.invoice.currency)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
