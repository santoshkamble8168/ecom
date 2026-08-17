import type {
  ApiResponse,
  ExchangeRequestSummary,
  OrderDetail,
  OrderInvoiceSummary,
  OrderStatus,
  ReasonOption,
  ReturnRequestSummary,
  ShipmentSummary,
} from "@ecom/types";

import { getApiUrl } from "@/lib/api-url";

import { apiFetch, getToken } from "./auth";

const API_URL = getApiUrl();

export type TrackingResult = ShipmentSummary & { orderNumber: string };

export function fetchOrderDetail(id: string): Promise<OrderDetail> {
  return apiFetch<OrderDetail>(`/orders/${id}/detail`);
}

export function fetchReturnReasons(): Promise<ReasonOption[]> {
  return apiFetch<ReasonOption[]>("/orders/meta/return-reasons");
}

export function fetchExchangeReasons(): Promise<ReasonOption[]> {
  return apiFetch<ReasonOption[]>("/orders/meta/exchange-reasons");
}

export function cancelOrder(id: string, reason?: string): Promise<OrderDetail> {
  return apiFetch<OrderDetail>(`/orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  });
}

export interface RequestReturnPayload {
  reasonCode: string;
  items: { variantSku: string; quantity: number }[];
  comments?: string;
  evidenceUrls?: string[];
}

export function requestReturn(id: string, payload: RequestReturnPayload): Promise<ReturnRequestSummary> {
  return apiFetch<ReturnRequestSummary>(`/orders/${id}/return`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface RequestExchangePayload {
  reasonCode: string;
  originalItems: { variantSku: string; quantity: number }[];
  desiredItems: { variantSku: string; quantity: number }[];
  comments?: string;
}

export function requestExchange(
  id: string,
  payload: RequestExchangePayload,
): Promise<ExchangeRequestSummary> {
  return apiFetch<ExchangeRequestSummary>(`/orders/${id}/exchange`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchInvoice(id: string): Promise<OrderInvoiceSummary> {
  return apiFetch<OrderInvoiceSummary>(`/orders/${id}/invoice`);
}

export async function openInvoiceView(id: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}/orders/${id}/invoice/view`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Could not load the invoice. Please try again.");
  }
  const html = await response.text();
  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(blobUrl, "_blank", "noopener,noreferrer");
}

export async function fetchTracking(shipmentNumber: string): Promise<TrackingResult> {
  const response = await fetch(`${API_URL}/tracking/${encodeURIComponent(shipmentNumber)}`);
  const body = (await response.json()) as ApiResponse<TrackingResult>;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}

/** Statuses at or beyond `confirmed` in the normal happy-path lifecycle — eligible to have an invoice generated. */
const INVOICEABLE_STATUSES = new Set<OrderStatus>([
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "return_requested",
  "returned",
  "exchange_requested",
  "exchanged",
]);

export function isInvoiceable(status: OrderStatus): boolean {
  return INVOICEABLE_STATUSES.has(status);
}

export interface OrderStatusMeta {
  label: string;
  textClassName: string;
  badgeClassName: string;
}

export function orderStatusMeta(status: OrderStatus): OrderStatusMeta {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        textClassName: "text-success-600",
        badgeClassName: "bg-success-50 text-success-700",
      };
    case "delivered":
      return {
        label: "Delivered",
        textClassName: "text-success-600",
        badgeClassName: "bg-success-50 text-success-700",
      };
    case "returned":
      return {
        label: "Returned",
        textClassName: "text-success-600",
        badgeClassName: "bg-success-50 text-success-700",
      };
    case "exchanged":
      return {
        label: "Exchanged",
        textClassName: "text-success-600",
        badgeClassName: "bg-success-50 text-success-700",
      };
    case "pending_payment":
      return {
        label: "Pending payment",
        textClassName: "text-neutral-600",
        badgeClassName: "bg-neutral-100 text-neutral-600",
      };
    case "processing":
      return {
        label: "Processing",
        textClassName: "text-neutral-600",
        badgeClassName: "bg-neutral-100 text-neutral-600",
      };
    case "shipped":
      return {
        label: "Shipped",
        textClassName: "text-neutral-600",
        badgeClassName: "bg-neutral-100 text-neutral-600",
      };
    case "return_requested":
      return {
        label: "Return requested",
        textClassName: "text-info-600",
        badgeClassName: "bg-brand-50 text-brand-700",
      };
    case "exchange_requested":
      return {
        label: "Exchange requested",
        textClassName: "text-info-600",
        badgeClassName: "bg-brand-50 text-brand-700",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        textClassName: "text-danger-600",
        badgeClassName: "bg-danger-50 text-danger-600",
      };
    case "failed":
      return {
        label: "Failed",
        textClassName: "text-danger-600",
        badgeClassName: "bg-danger-50 text-danger-600",
      };
    default:
      return {
        label: status,
        textClassName: "text-neutral-600",
        badgeClassName: "bg-neutral-100 text-neutral-600",
      };
  }
}
