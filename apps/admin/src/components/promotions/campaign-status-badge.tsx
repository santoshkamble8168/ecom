import type { CampaignStatus } from "@ecom/types";
import { cn } from "@ecom/ui";

const BADGE_BASE = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const TONE_CLASSES = {
  success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500",
  danger: "bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500",
} as const;

type Tone = keyof typeof TONE_CLASSES;

const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  scheduled: "Scheduled",
  active: "Active",
  ended: "Ended",
  cancelled: "Cancelled",
};

const CAMPAIGN_STATUS_TONES: Record<CampaignStatus, Tone> = {
  scheduled: "warning",
  active: "success",
  ended: "neutral",
  cancelled: "danger",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn(BADGE_BASE, TONE_CLASSES[CAMPAIGN_STATUS_TONES[status]])}>
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}

/** Mirrors the server-side state machine (`promotions/policies/campaign.policy.ts`) so the UI can
 * only offer valid next statuses; the server remains the source of truth and re-validates. */
export const CAMPAIGN_ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  scheduled: ["active", "cancelled"],
  active: ["ended", "cancelled"],
  ended: [],
  cancelled: [],
};
