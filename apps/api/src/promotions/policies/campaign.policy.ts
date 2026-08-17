import { ValidationError } from "@ecom/shared";
import type { CampaignStatus } from "@prisma/client";

/** Terminal states: no further transitions are permitted. */
const TERMINAL_STATUSES: CampaignStatus[] = ["ended", "cancelled"];

const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  scheduled: ["active", "cancelled"],
  active: ["ended", "cancelled"],
  ended: [],
  cancelled: [],
};

export function isTerminalCampaignStatus(status: CampaignStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCampaignTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (!canTransition(from, to)) {
    throw new ValidationError(`Cannot move campaign from "${from}" to "${to}"`);
  }
}
