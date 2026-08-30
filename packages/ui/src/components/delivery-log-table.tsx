import type { DeliveryLogEntry, DeliveryStatus } from "@ecom/types";

import { cn } from "../lib/cn";

import { DELIVERY_STATUS_PILLS, StatusPill } from "./status-pill";

export interface DeliveryLogTableProps {
  logs: DeliveryLogEntry[];
  className?: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function deliveryPill(status: DeliveryStatus) {
  return DELIVERY_STATUS_PILLS[status] ?? { label: status, tone: "neutral" as const };
}

export function DeliveryLogTable({ logs, className }: DeliveryLogTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Template
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Channel
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Destination
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Status
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Event
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Attempt
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-neutral-500">
                No delivery logs.
              </td>
            </tr>
          ) : (
            logs.map((log) => {
              const pill = deliveryPill(log.status);
              return (
                <tr key={log.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2 font-mono text-neutral-900 dark:text-neutral-50">{log.templateKey}</td>
                  <td className="px-3 py-2 text-neutral-500">{log.channel}</td>
                  <td className="px-3 py-2 text-neutral-900 dark:text-neutral-50">{log.destination}</td>
                  <td className="px-3 py-2">
                    <StatusPill label={pill.label} tone={pill.tone} />
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{log.eventType}</td>
                  <td className="px-3 py-2 text-neutral-500">{log.attempt}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                    <time dateTime={log.createdAt}>{formatTimestamp(log.createdAt)}</time>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
