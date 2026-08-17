import { cn } from "../lib/cn";

import { StatusPill, type StatusPillTone } from "./status-pill";

const KIND_TONE: Record<string, StatusPillTone> = {
  order: "brand",
  return: "warning",
  review: "success",
  note: "neutral",
  status: "warning",
  audit: "neutral",
};

export interface CustomerTimelineEvent {
  id: string;
  kind: string;
  title: string;
  detail?: string;
  createdAt: string;
}

export interface CustomerTimelineProps {
  events: CustomerTimelineEvent[];
  className?: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function CustomerTimeline({ events, className }: CustomerTimelineProps) {
  if (events.length === 0) {
    return <p className={cn("text-sm text-neutral-500", className)}>No activity yet.</p>;
  }

  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {events.map((event) => (
        <li key={event.id} className="relative border-l border-neutral-200 pl-4 dark:border-neutral-800">
          <span
            className="absolute -left-1 top-1.5 h-2 w-2 rounded-full bg-brand-500"
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-2">
            <time dateTime={event.createdAt} className="text-xs text-neutral-500">
              {formatTimestamp(event.createdAt)}
            </time>
            <StatusPill label={event.kind} tone={KIND_TONE[event.kind] ?? "neutral"} />
          </div>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{event.title}</p>
          {event.detail ? <p className="mt-0.5 text-sm text-neutral-500">{event.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}
