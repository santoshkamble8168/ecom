import type { CartLineItem } from "./cart";
import type { CustomerOrderSummary } from "./customer";

/** Order domain types shared across API, storefront, and admin (Sprint 9). */

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "return_requested"
  | "returned"
  | "exchange_requested"
  | "exchanged"
  | "cancelled"
  | "failed";

export type ShipmentStatus =
  | "pending"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "item_received"
  | "refunded"
  | "cancelled";

export type ExchangeStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "item_received"
  | "exchanged"
  | "cancelled";

export interface OrderShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderStatusEvent {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string | null;
  actorType: "customer" | "admin" | "system";
  createdAt: string;
}

export interface TrackingEventSummary {
  status: ShipmentStatus;
  description: string;
  location: string | null;
  occurredAt: string;
}

export interface ShipmentSummary {
  id: string;
  shipmentNumber: string;
  status: ShipmentStatus;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  events: TrackingEventSummary[];
}

export interface OrderReturnItem {
  variantSku: string;
  quantity: number;
}

export interface ReturnRequestSummary {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reasonCode: string;
  reasonLabel: string;
  items: OrderReturnItem[];
  comments: string | null;
  refundAmount: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface ExchangeRequestSummary {
  id: string;
  orderId: string;
  status: ExchangeStatus;
  reasonCode: string;
  reasonLabel: string;
  originalItems: OrderReturnItem[];
  desiredItems: OrderReturnItem[];
  comments: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface OrderInvoiceSummary {
  invoiceNumber: string;
  issuedAt: string;
  total: string;
  currency: string;
  viewUrl: string;
}

export interface ReasonOption {
  id: string;
  code: string;
  label: string;
}

export interface OrderActionEligibility {
  cancellable: boolean;
  returnEligible: boolean;
  exchangeEligible: boolean;
  returnWindowEndsAt: string | null;
  exchangeWindowEndsAt: string | null;
}

export interface OrderDetail extends CustomerOrderSummary {
  address: OrderShippingAddress;
  items: CartLineItem[];
  timeline: OrderStatusEvent[];
  shipments: ShipmentSummary[];
  returnRequests: ReturnRequestSummary[];
  exchangeRequests: ExchangeRequestSummary[];
  invoice: OrderInvoiceSummary | null;
  actions: OrderActionEligibility;
}

export interface AdminOrderSummary extends CustomerOrderSummary {
  customerEmail: string | null;
  customerName: string | null;
}

export interface AdminOrderDetail extends OrderDetail {
  customerEmail: string | null;
  customerName: string | null;
  userId: string | null;
}

export interface AdminOrderListResult {
  orders: AdminOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
}
