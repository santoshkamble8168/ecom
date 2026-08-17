import { cn } from "@ecom/ui";

const BADGE_BASE = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const TONE_CLASSES = {
  success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500",
} as const;

export function SaleActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(BADGE_BASE, active ? TONE_CLASSES.success : TONE_CLASSES.neutral)}>
      {active ? "Sale Active" : "No Sale"}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(BADGE_BASE, active ? TONE_CLASSES.success : TONE_CLASSES.warning)}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}
