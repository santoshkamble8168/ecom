"use client";

import type {
  ExchangeRequestSummary,
  OrderDetail,
  OrderStatusEvent,
  ReasonOption,
  ReturnRequestSummary,
  ShipmentSummary,
  TrackingEventSummary,
} from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { StorefrontImage } from "@/components/media/storefront-image";

import { getToken } from "@/lib/auth";
import { formatInr } from "@/lib/cart";
import {
  cancelOrder,
  fetchExchangeReasons,
  fetchInvoice,
  fetchOrderDetail,
  fetchReturnReasons,
  isInvoiceable,
  openInvoiceView,
  orderStatusMeta,
  requestExchange,
  requestReturn,
} from "@/lib/orders";

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

function StatusBadge({ status }: { status: OrderDetail["status"] }) {
  const meta = orderStatusMeta(status);
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClassName}`}>
      {meta.label}
    </span>
  );
}

function OrderTimeline({ events }: { events: OrderStatusEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No status history yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {events.map((event, idx) => (
        <li key={`${event.toStatus}-${event.createdAt}-${idx}`} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
          <div className="text-sm">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {orderStatusMeta(event.toStatus).label}
            </p>
            {event.reason && <p className="text-neutral-500">{event.reason}</p>}
            <p className="text-xs text-neutral-400">
              {formatDateTime(event.createdAt)} · {event.actorType}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ShipmentEventList({ events }: { events: TrackingEventSummary[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-neutral-500">No tracking events yet.</p>;
  }
  return (
    <ol className="mt-3 space-y-3 border-l border-neutral-200 pl-4 dark:border-neutral-800">
      {events.map((event, idx) => (
        <li key={`${event.status}-${event.occurredAt}-${idx}`} className="text-xs">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">{event.description}</p>
          <p className="text-neutral-400">
            {formatDateTime(event.occurredAt)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ShipmentCard({ shipment }: { shipment: ShipmentSummary }) {
  return (
    <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Shipment {shipment.shipmentNumber}</p>
          <p className="text-xs text-neutral-500">{shipment.courierName ?? "Courier not assigned yet"}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-800">
          {shipment.status.replace(/_/g, " ")}
        </span>
      </div>

      <dl className="mt-3 grid gap-1 text-xs text-neutral-500 sm:grid-cols-2">
        {shipment.trackingNumber && (
          <div>
            <dt className="inline">Tracking number: </dt>
            <dd className="inline font-medium text-neutral-700 dark:text-neutral-300">
              {shipment.trackingUrl ? (
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-info-600 hover:underline"
                >
                  {shipment.trackingNumber}
                </a>
              ) : (
                <Link
                  href={`/track/${encodeURIComponent(shipment.shipmentNumber)}`}
                  className="text-info-600 hover:underline"
                >
                  {shipment.trackingNumber}
                </Link>
              )}
            </dd>
          </div>
        )}
        {!shipment.trackingNumber && (
          <div>
            <Link
              href={`/track/${encodeURIComponent(shipment.shipmentNumber)}`}
              className="text-info-600 hover:underline"
            >
              Track this shipment
            </Link>
          </div>
        )}
        {shipment.estimatedDeliveryAt && (
          <div>
            <dt className="inline">Estimated delivery: </dt>
            <dd className="inline">{formatDate(shipment.estimatedDeliveryAt)}</dd>
          </div>
        )}
        {shipment.shippedAt && (
          <div>
            <dt className="inline">Shipped: </dt>
            <dd className="inline">{formatDate(shipment.shippedAt)}</dd>
          </div>
        )}
        {shipment.deliveredAt && (
          <div>
            <dt className="inline">Delivered: </dt>
            <dd className="inline">{formatDate(shipment.deliveredAt)}</dd>
          </div>
        )}
      </dl>

      <ShipmentEventList events={shipment.events} />
    </div>
  );
}

function ReturnRequestCard({ request }: { request: ReturnRequestSummary }) {
  return (
    <div className="rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Return request</p>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold capitalize text-neutral-600 dark:bg-neutral-800">
          {request.status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">Reason: {request.reasonLabel}</p>
      <ul className="mt-1 list-inside list-disc text-neutral-500">
        {request.items.map((item) => (
          <li key={item.variantSku}>
            {item.variantSku} × {item.quantity}
          </li>
        ))}
      </ul>
      {request.comments && <p className="mt-2 text-neutral-500">“{request.comments}”</p>}
      {request.refundAmount && (
        <p className="mt-2 font-medium text-success-600">Refund amount: {formatInr(request.refundAmount)}</p>
      )}
      <p className="mt-2 text-xs text-neutral-400">
        Requested {formatDateTime(request.requestedAt)}
        {request.resolvedAt ? ` · Resolved ${formatDateTime(request.resolvedAt)}` : ""}
      </p>
    </div>
  );
}

function ExchangeRequestCard({ request }: { request: ExchangeRequestSummary }) {
  return (
    <div className="rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Exchange request</p>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold capitalize text-neutral-600 dark:bg-neutral-800">
          {request.status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">Reason: {request.reasonLabel}</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-400">Original</p>
          <ul className="list-inside list-disc text-neutral-500">
            {request.originalItems.map((item) => (
              <li key={item.variantSku}>
                {item.variantSku} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-400">Desired</p>
          <ul className="list-inside list-disc text-neutral-500">
            {request.desiredItems.map((item, idx) => (
              <li key={`${item.variantSku}-${idx}`}>
                {item.variantSku} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {request.comments && <p className="mt-2 text-neutral-500">“{request.comments}”</p>}
      <p className="mt-2 text-xs text-neutral-400">
        Requested {formatDateTime(request.requestedAt)}
        {request.resolvedAt ? ` · Resolved ${formatDateTime(request.resolvedAt)}` : ""}
      </p>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [returnReasons, setReturnReasons] = useState<ReasonOption[]>([]);
  const [exchangeReasons, setExchangeReasons] = useState<ReasonOption[]>([]);

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReasonCode, setReturnReasonCode] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnComments, setReturnComments] = useState("");

  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [exchangeReasonCode, setExchangeReasonCode] = useState("");
  const [exchangeQuantities, setExchangeQuantities] = useState<Record<string, number>>({});
  const [desiredSkus, setDesiredSkus] = useState<Record<string, string>>({});
  const [exchangeComments, setExchangeComments] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchOrderDetail(orderId);
      setOrder(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    if (!getToken()) {
      router.replace(`/account?next=${encodeURIComponent(`/account/orders/${orderId}`)}`);
      return;
    }
    void load();
  }, [orderId, router, load]);

  useEffect(() => {
    fetchReturnReasons()
      .then(setReturnReasons)
      .catch(() => setReturnReasons([]));
    fetchExchangeReasons()
      .then(setExchangeReasons)
      .catch(() => setExchangeReasons([]));
  }, []);

  async function handleCancel() {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await cancelOrder(order.id, cancelReason);
      setOrder(updated);
      setShowCancelForm(false);
      setCancelReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not cancel this order");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleReturnItem(sku: string, maxQuantity: number, checked: boolean) {
    setReturnQuantities((prev) => {
      const next = { ...prev };
      if (checked) next[sku] = Math.min(1, maxQuantity);
      else delete next[sku];
      return next;
    });
  }

  async function handleSubmitReturn() {
    if (!order) return;
    const items = Object.entries(returnQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([variantSku, quantity]) => ({ variantSku, quantity }));
    if (!returnReasonCode) {
      setActionError("Please select a reason for the return");
      return;
    }
    if (items.length === 0) {
      setActionError("Please select at least one item to return");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await requestReturn(order.id, {
        reasonCode: returnReasonCode,
        items,
        comments: returnComments.trim() || undefined,
      });
      await load();
      setShowReturnForm(false);
      setReturnReasonCode("");
      setReturnQuantities({});
      setReturnComments("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not submit the return request");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleExchangeItem(sku: string, maxQuantity: number, checked: boolean) {
    setExchangeQuantities((prev) => {
      const next = { ...prev };
      if (checked) next[sku] = Math.min(1, maxQuantity);
      else delete next[sku];
      return next;
    });
    if (!checked) {
      setDesiredSkus((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
    }
  }

  async function handleSubmitExchange() {
    if (!order) return;
    const originalItems = Object.entries(exchangeQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([variantSku, quantity]) => ({ variantSku, quantity }));
    const desiredItems = originalItems.map(({ variantSku, quantity }) => ({
      variantSku: (desiredSkus[variantSku] ?? "").trim(),
      quantity,
    }));

    if (!exchangeReasonCode) {
      setActionError("Please select a reason for the exchange");
      return;
    }
    if (originalItems.length === 0) {
      setActionError("Please select at least one item to exchange");
      return;
    }
    if (desiredItems.some((item) => !item.variantSku)) {
      setActionError("Please enter a desired variant SKU for every selected item");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await requestExchange(order.id, {
        reasonCode: exchangeReasonCode,
        originalItems,
        desiredItems,
        comments: exchangeComments.trim() || undefined,
      });
      await load();
      setShowExchangeForm(false);
      setExchangeReasonCode("");
      setExchangeQuantities({});
      setDesiredSkus({});
      setExchangeComments("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not submit the exchange request");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleViewInvoice() {
    if (!order) return;
    setInvoiceLoading(true);
    setActionError(null);
    try {
      if (!order.invoice) {
        const invoice = await fetchInvoice(order.id);
        setOrder((prev) => (prev ? { ...prev, invoice } : prev));
      }
      await openInvoiceView(order.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not open the invoice");
    } finally {
      setInvoiceLoading(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-neutral-500">Loading order…</div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold">Order not found</h1>
        <p className="mt-2 text-neutral-500">{error ?? "This order could not be loaded."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
          <Link
            href="/account"
            className="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Back to account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/account" className="text-sm font-medium text-info-600 hover:underline">
          ← Back to orders
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-neutral-500">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {actionError && (
        <div className="mb-4 rounded-md border border-danger-500/40 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {actionError}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between sm:block">
                <dt className="text-neutral-500">Payment method</dt>
                <dd className="font-medium uppercase">{order.paymentMethod}</dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-neutral-500">Payment status</dt>
                <dd className="font-medium">{order.paymentStatus ?? "—"}</dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-neutral-500">Items</dt>
                <dd>{order.itemCount}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold sm:block sm:border-0 sm:pt-0 sm:text-sm sm:font-medium">
                <dt className="text-neutral-500 sm:font-normal">Order total</dt>
                <dd>{formatInr(order.total)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-3">
              {order.actions.cancellable && !showCancelForm && (
                <Button variant="destructive" size="sm" onClick={() => setShowCancelForm(true)}>
                  Cancel order
                </Button>
              )}
              {order.actions.returnEligible && !showReturnForm && (
                <Button variant="outline" size="sm" onClick={() => setShowReturnForm(true)}>
                  Request return
                </Button>
              )}
              {order.actions.exchangeEligible && !showExchangeForm && (
                <Button variant="outline" size="sm" onClick={() => setShowExchangeForm(true)}>
                  Request exchange
                </Button>
              )}
            </div>

            {order.actions.returnWindowEndsAt && order.actions.returnEligible && (
              <p className="mt-2 text-xs text-neutral-400">
                Returns accepted until {formatDate(order.actions.returnWindowEndsAt)}
              </p>
            )}
            {order.actions.exchangeWindowEndsAt && order.actions.exchangeEligible && (
              <p className="mt-1 text-xs text-neutral-400">
                Exchanges accepted until {formatDate(order.actions.exchangeWindowEndsAt)}
              </p>
            )}

            {showCancelForm && (
              <div className="mt-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                <label className="text-sm">
                  Reason (optional)
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    placeholder="Let us know why you're cancelling"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => void handleCancel()}>
                    {actionLoading ? "Cancelling…" : "Confirm cancellation"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelReason("");
                      setActionError(null);
                    }}
                  >
                    Never mind
                  </Button>
                </div>
              </div>
            )}

            {showReturnForm && (
              <div className="mt-4 space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-sm font-semibold">Request a return</p>
                <label className="block text-sm">
                  Reason
                  <select
                    value={returnReasonCode}
                    onChange={(e) => setReturnReasonCode(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <option value="">Select a reason</option>
                    {returnReasons.map((reason) => (
                      <option key={reason.id} value={reason.code}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <p className="text-sm text-neutral-500">Select items to return</p>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-800"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.variantSku in returnQuantities}
                          onChange={(e) => toggleReturnItem(item.variantSku, item.quantity, e.target.checked)}
                        />
                        <span>
                          {item.product?.title ?? item.productSlug}
                          {item.variantLabel ? ` (${item.variantLabel})` : ""} — purchased {item.quantity}
                        </span>
                      </label>
                      {item.variantSku in returnQuantities && (
                        <label className="flex items-center gap-2 text-xs text-neutral-500">
                          Qty
                          <input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={returnQuantities[item.variantSku]}
                            onChange={(e) =>
                              setReturnQuantities((prev) => ({
                                ...prev,
                                [item.variantSku]: Math.max(
                                  1,
                                  Math.min(item.quantity, Number(e.target.value) || 1),
                                ),
                              }))
                            }
                            className="w-16 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                <label className="block text-sm">
                  Comments (optional)
                  <textarea
                    value={returnComments}
                    onChange={(e) => setReturnComments(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>

                <div className="flex gap-2">
                  <Button size="sm" disabled={actionLoading} onClick={() => void handleSubmitReturn()}>
                    {actionLoading ? "Submitting…" : "Submit return request"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => {
                      setShowReturnForm(false);
                      setReturnQuantities({});
                      setReturnReasonCode("");
                      setReturnComments("");
                      setActionError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {showExchangeForm && (
              <div className="mt-4 space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-sm font-semibold">Request an exchange</p>
                <label className="block text-sm">
                  Reason
                  <select
                    value={exchangeReasonCode}
                    onChange={(e) => setExchangeReasonCode(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <option value="">Select a reason</option>
                    {exchangeReasons.map((reason) => (
                      <option key={reason.id} value={reason.code}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <p className="text-sm text-neutral-500">Select items to exchange</p>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.variantSku in exchangeQuantities}
                            onChange={(e) => toggleExchangeItem(item.variantSku, item.quantity, e.target.checked)}
                          />
                          <span>
                            {item.product?.title ?? item.productSlug}
                            {item.variantLabel ? ` (${item.variantLabel})` : ""} — purchased {item.quantity}
                          </span>
                        </label>
                        {item.variantSku in exchangeQuantities && (
                          <label className="flex items-center gap-2 text-xs text-neutral-500">
                            Qty
                            <input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={exchangeQuantities[item.variantSku]}
                              onChange={(e) =>
                                setExchangeQuantities((prev) => ({
                                  ...prev,
                                  [item.variantSku]: Math.max(
                                    1,
                                    Math.min(item.quantity, Number(e.target.value) || 1),
                                  ),
                                }))
                              }
                              className="w-16 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                            />
                          </label>
                        )}
                      </div>
                      {item.variantSku in exchangeQuantities && (
                        <label className="block pl-6 text-xs text-neutral-500">
                          Desired variant SKU
                          <input
                            type="text"
                            value={desiredSkus[item.variantSku] ?? ""}
                            onChange={(e) =>
                              setDesiredSkus((prev) => ({ ...prev, [item.variantSku]: e.target.value }))
                            }
                            placeholder="e.g. TSHIRT-BLU-M"
                            className="mt-1 w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                <label className="block text-sm">
                  Comments (optional)
                  <textarea
                    value={exchangeComments}
                    onChange={(e) => setExchangeComments(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>

                <div className="flex gap-2">
                  <Button size="sm" disabled={actionLoading} onClick={() => void handleSubmitExchange()}>
                    {actionLoading ? "Submitting…" : "Submit exchange request"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => {
                      setShowExchangeForm(false);
                      setExchangeQuantities({});
                      setDesiredSkus({});
                      setExchangeReasonCode("");
                      setExchangeComments("");
                      setActionError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
                  {item.product?.primaryImage && (
                    <StorefrontImage
                      src={item.product.primaryImage.url}
                      alt={item.product.title}
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{item.product?.title ?? item.productSlug}</p>
                  {item.variantLabel && <p className="text-neutral-500">Size: {item.variantLabel}</p>}
                  <p className="text-neutral-500">Qty: {item.quantity}</p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="font-semibold">{formatInr(item.lineTotal)}</p>
                  <p className="text-xs text-neutral-400">{formatInr(item.unitPrice)} each</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-700 dark:text-neutral-300">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{order.address.fullName}</p>
            <p>{order.address.line1}</p>
            {order.address.line2 && <p>{order.address.line2}</p>}
            <p>
              {order.address.city}, {order.address.state} — {order.address.postalCode}
            </p>
            <p>{order.address.country}</p>
            <p className="mt-1">{order.address.phone}</p>
          </CardContent>
        </Card>

        {order.shipments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Shipments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.shipments.map((shipment) => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
              ))}
            </CardContent>
          </Card>
        )}

        {(order.returnRequests.length > 0 || order.exchangeRequests.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Your requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.returnRequests.map((request) => (
                <ReturnRequestCard key={request.id} request={request} />
              ))}
              {order.exchangeRequests.map((request) => (
                <ExchangeRequestCard key={request.id} request={request} />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Order status history</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline events={order.timeline} />
          </CardContent>
        </Card>

        {(order.invoice || isInvoiceable(order.status)) && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.invoice ? (
                <dl className="grid gap-1 sm:grid-cols-2">
                  <div>
                    <dt className="inline text-neutral-500">Invoice number: </dt>
                    <dd className="inline font-medium">{order.invoice.invoiceNumber}</dd>
                  </div>
                  <div>
                    <dt className="inline text-neutral-500">Issued: </dt>
                    <dd className="inline">{formatDate(order.invoice.issuedAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-neutral-500">Total: </dt>
                    <dd className="inline font-medium">{formatInr(order.invoice.total)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-neutral-500">No invoice generated yet for this order.</p>
              )}
              <Button size="sm" variant="outline" disabled={invoiceLoading} onClick={() => void handleViewInvoice()}>
                {invoiceLoading
                  ? "Preparing…"
                  : order.invoice
                    ? "View / print invoice"
                    : "Generate invoice"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
