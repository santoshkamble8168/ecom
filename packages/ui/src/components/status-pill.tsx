import { cn } from "../lib/cn";

const TONE_CLASSES = {
  success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500",
  danger: "bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500",
} as const;

export type StatusPillTone = keyof typeof TONE_CLASSES;

export interface StatusPillProps {
  label: string;
  tone?: StatusPillTone;
  className?: string;
}

/** Shared status pill used by inventory, promotions, and CMS admin surfaces. */
export function StatusPill({ label, tone = "neutral", className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export const PURCHASE_ORDER_STATUS_PILLS = {
  draft: { label: "Draft", tone: "neutral" },
  ordered: { label: "Ordered", tone: "brand" },
  partially_received: { label: "Partially Received", tone: "warning" },
  received: { label: "Received", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: StatusPillTone }>;

export const CAMPAIGN_STATUS_PILLS = {
  scheduled: { label: "Scheduled", tone: "warning" },
  active: { label: "Active", tone: "success" },
  ended: { label: "Ended", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: StatusPillTone }>;

export const CONTENT_STATUS_PILLS = {
  draft: { label: "Draft", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "warning" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: StatusPillTone }>;
