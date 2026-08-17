import type { ContentStatus } from "@ecom/types";
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

const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const CONTENT_STATUS_TONES: Record<ContentStatus, Tone> = {
  draft: "neutral",
  scheduled: "warning",
  published: "success",
  archived: "danger",
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASSES[CONTENT_STATUS_TONES[status]])}>
      {CONTENT_STATUS_LABELS[status]}
    </span>
  );
}
