import type { ExchangeStatus, OrderStatus, ReturnStatus, ShipmentStatus } from "@ecom/types";
import { cn } from "@ecom/ui";

const BADGE_BASE = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const TONE_CLASSES = {
  success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500",
  danger: "bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500",
} as const;

type Tone = keyof typeof TONE_CLASSES;

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  return_requested: "Return Requested",
  returned: "Returned",
  exchange_requested: "Exchange Requested",
  exchanged: "Exchanged",
  cancelled: "Cancelled",
  failed: "Failed",
};

const ORDER_STATUS_TONES: Record<OrderStatus, Tone> = {
  pending_payment: "warning",
  confirmed: "success",
  processing: "neutral",
  shipped: "neutral",
  delivered: "success",
  return_requested: "warning",
  returned: "success",
  exchange_requested: "warning",
  exchanged: "success",
  cancelled: "danger",
  failed: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASSES[ORDER_STATUS_TONES[status]])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "Pending",
  in_transit: "In Transit",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  failed: "Failed",
  returned: "Returned",
};

const SHIPMENT_STATUS_TONES: Record<ShipmentStatus, Tone> = {
  pending: "neutral",
  in_transit: "brand",
  out_for_delivery: "brand",
  delivered: "success",
  failed: "danger",
  returned: "warning",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASSES[SHIPMENT_STATUS_TONES[status]])}>
      {SHIPMENT_STATUS_LABELS[status]}
    </span>
  );
}

const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  item_received: "Item Received",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

const RETURN_STATUS_TONES: Record<ReturnStatus, Tone> = {
  requested: "warning",
  approved: "brand",
  rejected: "danger",
  item_received: "brand",
  refunded: "success",
  cancelled: "neutral",
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASSES[RETURN_STATUS_TONES[status]])}>
      {RETURN_STATUS_LABELS[status]}
    </span>
  );
}

const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  item_received: "Item Received",
  exchanged: "Exchanged",
  cancelled: "Cancelled",
};

const EXCHANGE_STATUS_TONES: Record<ExchangeStatus, Tone> = {
  requested: "warning",
  approved: "brand",
  rejected: "danger",
  item_received: "brand",
  exchanged: "success",
  cancelled: "neutral",
};

export function ExchangeStatusBadge({ status }: { status: ExchangeStatus }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASSES[EXCHANGE_STATUS_TONES[status]])}>
      {EXCHANGE_STATUS_LABELS[status]}
    </span>
  );
}
