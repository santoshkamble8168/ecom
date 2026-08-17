import type { AdminCustomerListItem } from "@ecom/types";
import { StatusPill, type StatusPillTone } from "@ecom/ui";

type CustomerStatus = AdminCustomerListItem["status"];

const STATUS_TONE: Record<CustomerStatus, StatusPillTone> = {
  active: "success",
  suspended: "danger",
  pending_verification: "warning",
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  pending_verification: "Pending verification",
};

export function CustomerStatusPill({ status }: { status: CustomerStatus }) {
  return <StatusPill label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />;
}
