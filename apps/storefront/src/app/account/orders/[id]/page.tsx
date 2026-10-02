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
import { Button } from "@ecom/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { StorefrontImage } from "@/components/media/storefront-image";

import { hasSession } from "@/lib/auth";
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

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function milestoneSteps(order: OrderDetail): { label: string; at: string | null; done: boolean; failed: boolean }[] {
  const dated = [...order.timeline].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const atStatus = (status: OrderStatusEvent["toStatus"]) =>
    dated.find((event) => event.toStatus === status)?.createdAt ?? null;
  const shippedAt = order.shipments.find((shipment) => shipment.shippedAt)?.shippedAt ?? atStatus("shipped");
  const deliveredAt = order.shipments.find((shipment) => shipment.deliveredAt)?.deliveredAt ?? atStatus("delivered");

  if (order.status === "cancelled" || order.status === "failed") {
    const steps = dated.map((event) => ({
      label: orderStatusMeta(event.toStatus).label,
      at: event.createdAt,
      done: true,
      failed: event.toStatus === "cancelled" || event.toStatus === "failed",
    }));
    return steps.length > 0
      ? steps
      : [{ label: orderStatusMeta(order.status).label, at: order.createdAt, done: true, failed: true }];
  }

  return [
    { label: "Order confirmed", at: order.confirmedAt ?? atStatus("confirmed") ?? order.createdAt, done: true, failed: false },
    { label: "Shipped", at: shippedAt, done: Boolean(shippedAt) || order.status === "delivered", failed: false },
    { label: "Delivered", at: deliveredAt, done: Boolean(deliveredAt) || order.status === "delivered", failed: false },
  ].filter((step) => step.done || step.label === "Order confirmed");
}

function MilestoneList({ steps }: { steps: ReturnType<typeof milestoneSteps> }) {
  return (
    <ol>
      {steps.map((step, index) => (
        <li key={`${step.label}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
          {index < steps.length - 1 ? (
            <span
              className={`absolute left-[9px] top-5 h-[calc(100%-8px)] w-px ${step.done && !step.failed ? "bg-success-500" : "bg-neutral-200"}`}
              aria-hidden="true"
            />
          ) : null}
          <span className="relative z-10">
            {step.done ? <CheckIcon failed={step.failed} /> : <PendingIcon />}
          </span>
          <p className="text-sm text-neutral-900">
            {step.label}
            {step.at ? <span className="text-neutral-500">, {shortDate(step.at)}</span> : null}
          </p>
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
  const [showUpdates, setShowUpdates] = useState(false);

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
    if (!hasSession()) {
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

  const listingPrice = order.items.reduce((sum, item) => {
    const compare = item.product?.compareAtPrice ? Number(item.product.compareAtPrice) : Number(item.unitPrice);
    return sum + compare * item.quantity;
  }, 0);
  const specialPrice = order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  const addressLine = [order.address.line1, order.address.line2, order.address.city, `${order.address.state} ${order.address.postalCode}`]
    .filter(Boolean)
    .join(", ");
  const returnNote =
    order.actions.returnEligible && order.actions.returnWindowEndsAt
      ? `Return window open until ${formatDate(order.actions.returnWindowEndsAt)}`
      : order.actions.returnWindowEndsAt
        ? `Return policy ended on ${formatDate(order.actions.returnWindowEndsAt)}`
        : "Returns are available after delivery";
  const paymentLabel = order.paymentMethod === "cod" ? "Cash on delivery" : "Online payment";

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/account?tab=orders" className="text-sm font-medium text-info-600 hover:underline">
          ← Orders
        </Link>
        <p className="mt-2 text-xs text-neutral-500">
          Order {order.orderNumber} · Placed {formatDate(order.createdAt)}
        </p>

        {actionError && (
          <div className="mt-4 rounded-md border border-danger-500/40 bg-danger-50 px-4 py-3 text-sm text-danger-600">
            {actionError}
          </div>
        )}

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            {order.items.map((item) => (
              <article key={item.id} className="rounded-sm border border-neutral-200 bg-white p-4">
                <div className="flex gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.productSlug}`} className="text-sm font-medium leading-snug text-neutral-950 hover:text-info-600">
                      {item.product?.title ?? item.productSlug}
                    </Link>
                    {item.variantLabel ? <p className="mt-2 text-sm text-neutral-500">{item.variantLabel}</p> : null}
                    <p className="mt-1 text-sm text-neutral-500">
                      Seller: <span className="font-medium text-neutral-800">{item.product?.brand ?? "ECOM"}</span>
                    </p>
                    <p className="mt-2 text-lg font-semibold text-neutral-950">{formatInr(item.lineTotal)}</p>
                    {item.quantity > 1 ? (
                      <p className="text-xs text-neutral-500">Qty {item.quantity}</p>
                    ) : null}
                  </div>
                  <Link href={`/products/${item.productSlug}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
                    {item.product?.primaryImage ? (
                      <StorefrontImage
                        src={item.product.primaryImage.url}
                        alt={item.product.title}
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : null}
                  </Link>
                </div>
              </article>
            ))}

            <section className="rounded-sm border border-neutral-200 bg-white px-4 py-4">
              <MilestoneList steps={milestoneSteps(order)} />
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-info-600 hover:underline"
                onClick={() => setShowUpdates((open) => !open)}
              >
                {showUpdates ? "Hide updates" : "See all updates"}
                <ChevronIcon open={showUpdates} />
              </button>
              {showUpdates ? (
                <div className="mt-4 space-y-4 border-t border-neutral-200 pt-4">
                  {order.timeline.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      Order confirmed on {formatDate(order.confirmedAt ?? order.createdAt)}.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {[...order.timeline].reverse().map((event, index) => (
                        <li key={`${event.toStatus}-${event.createdAt}-${index}`} className="text-sm">
                          <p className="font-medium text-neutral-900">{orderStatusMeta(event.toStatus).label}</p>
                          {event.reason ? <p className="text-neutral-500">{event.reason}</p> : null}
                          <p className="text-xs text-neutral-400">{formatDateTime(event.createdAt)}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                  {order.shipments.map((shipment) => (
                    <ShipmentCard key={shipment.id} shipment={shipment} />
                  ))}
                </div>
              ) : null}
              <p className="mt-4 text-sm text-neutral-500">{returnNote}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {order.actions.cancellable && !showCancelForm ? (
                  <Button variant="outline" size="sm" onClick={() => setShowCancelForm(true)}>
                    Cancel order
                  </Button>
                ) : null}
                {order.actions.returnEligible && !showReturnForm ? (
                  <Button variant="outline" size="sm" onClick={() => setShowReturnForm(true)}>
                    Request return
                  </Button>
                ) : null}
                {order.actions.exchangeEligible && !showExchangeForm ? (
                  <Button variant="outline" size="sm" onClick={() => setShowExchangeForm(true)}>
                    Request exchange
                  </Button>
                ) : null}
              </div>
            </section>

            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 rounded-sm border border-neutral-200 bg-white py-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <ChatIcon />
              Chat with us
            </Link>

            <section className="rounded-sm border border-neutral-200 bg-white p-4">
              <h2 className="text-base font-semibold text-neutral-950">Rate your experience</h2>
              <div className="mt-3 space-y-2">
                {order.items.map((item) => (
                  <Link
                    key={`rate-${item.id}`}
                    href={`/products/${item.productSlug}#reviews`}
                    className="flex items-center justify-between gap-3 rounded-sm bg-neutral-50 px-3 py-3 text-sm hover:bg-neutral-100"
                  >
                    <span className="inline-flex items-center gap-2 text-neutral-700">
                      <StarOutlineIcon />
                      Rate {item.product?.title ?? "the product"}
                    </span>
                    <span className="flex shrink-0 gap-1 text-neutral-300" aria-hidden="true">
                      {Array.from({ length: 5 }, (_, star) => (
                        <StarOutlineIcon key={star} />
                      ))}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {(order.returnRequests.length > 0 || order.exchangeRequests.length > 0) && (
              <section className="space-y-3 rounded-sm border border-neutral-200 bg-white p-4">
                <h2 className="text-base font-semibold">Your requests</h2>
                {order.returnRequests.map((request) => (
                  <ReturnRequestCard key={request.id} request={request} />
                ))}
                {order.exchangeRequests.map((request) => (
                  <ExchangeRequestCard key={request.id} request={request} />
                ))}
              </section>
            )}

            {showCancelForm || showReturnForm || showExchangeForm ? (
              <div className="rounded-sm border border-neutral-200 bg-white p-4">
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
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <section className="rounded-sm border border-neutral-200 bg-white p-4 text-sm">
              <p className="flex items-start gap-2 text-neutral-800">
                <HomeIcon />
                <span className="min-w-0">
                  <span className="font-semibold">Delivery</span>{" "}
                  <span className="text-neutral-600">{addressLine}</span>
                </span>
              </p>
              <p className="mt-3 flex items-start gap-2 text-neutral-800">
                <UserIcon />
                <span>
                  <span className="font-semibold">{order.address.fullName}</span>{" "}
                  <span className="text-neutral-600">{order.address.phone}</span>
                </span>
              </p>
            </section>

            <section className="rounded-sm border border-neutral-200 bg-white p-4 text-sm">
              <dl className="space-y-3">
                <div className="flex justify-between gap-4 text-neutral-600">
                  <dt>Listing price</dt>
                  <dd>{formatInr(listingPrice)}</dd>
                </div>
                {specialPrice < listingPrice ? (
                  <div className="flex justify-between gap-4 text-neutral-800">
                    <dt>Special price</dt>
                    <dd className="font-semibold">{formatInr(specialPrice)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 border-t border-dashed border-neutral-300 pt-3 font-semibold text-neutral-950">
                  <dt>Total amount</dt>
                  <dd>{formatInr(order.total)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4 text-neutral-700">
                <span>Paid by</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  <CardIcon />
                  {paymentLabel}
                  {order.paymentStatus ? <span className="text-xs capitalize text-neutral-500">{order.paymentStatus}</span> : null}
                </span>
              </div>
              {order.invoice || isInvoiceable(order.status) ? (
                <button
                  type="button"
                  disabled={invoiceLoading}
                  onClick={() => void handleViewInvoice()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
                >
                  <DownloadIcon />
                  {invoiceLoading ? "Preparing…" : "Download invoice"}
                </button>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ failed }: { failed?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-5 w-5 ${failed ? "text-danger-600" : "text-success-600"}`} aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M6 10.2 8.6 12.8 14 7.4" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 text-neutral-300" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 5 5 5-5 5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17.5 4 20V6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v9A1.5 1.5 0 0 1 18.5 17H7Z" />
    </svg>
  );
}

function StarOutlineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path strokeLinejoin="round" d="m12 3.5 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.8 7.2 18.4l.9-5.4L4.2 9.2l5.4-.8L12 3.5Z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path strokeLinecap="round" d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}
