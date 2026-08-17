import type { PurchaseOrderStatus } from "@ecom/types";
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

const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

const PURCHASE_ORDER_STATUS_TONES: Record<PurchaseOrderStatus, Tone> = {
  draft: "neutral",
  ordered: "brand",
  partially_received: "warning",
  received: "success",
  cancelled: "danger",
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASSES[PURCHASE_ORDER_STATUS_TONES[status]])}>
      {PURCHASE_ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function LowStockBadge() {
  return <span className={cn(BADGE_BASE, TONE_CLASSES.warning)}>Low Stock</span>;
}
