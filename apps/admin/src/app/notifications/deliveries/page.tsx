"use client";

import type { DeliveryLogListResult, DeliveryStatus, NotificationChannel } from "@ecom/types";
import { Button, Card, CardContent, DeliveryLogTable } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 20;
const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const STATUS_OPTIONS: DeliveryStatus[] = ["queued", "sending", "sent", "failed", "skipped"];
const CHANNEL_OPTIONS: NotificationChannel[] = ["email", "sms", "whatsapp", "push", "in_app"];

interface DeliveryFilters {
  status: "" | DeliveryStatus;
  channel: "" | NotificationChannel;
  templateKey: string;
}

const EMPTY_FILTERS: DeliveryFilters = {
  status: "",
  channel: "",
  templateKey: "",
};

export default function NotificationDeliveriesPage() {
  const [draft, setDraft] = useState<DeliveryFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<DeliveryFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-notification-deliveries", { filters, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (filters.status) params.set("status", filters.status);
      if (filters.channel) params.set("channel", filters.channel);
      if (filters.templateKey) params.set("templateKey", filters.templateKey);
      return apiFetch<DeliveryLogListResult>(`/admin/notifications/deliveries?${params.toString()}`);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Deliveries</h1>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setFilters(draft);
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Status</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value as DeliveryFilters["status"] }))
                }
                className={INPUT_CLASS}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Channel</span>
              <select
                value={draft.channel}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, channel: event.target.value as DeliveryFilters["channel"] }))
                }
                className={INPUT_CLASS}
              >
                <option value="">All channels</option>
                {CHANNEL_OPTIONS.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Template key</span>
              <input
                type="text"
                value={draft.templateKey}
                onChange={(event) => setDraft((current) => ({ ...current, templateKey: event.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft(EMPTY_FILTERS);
                  setFilters(EMPTY_FILTERS);
                  setPage(1);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading deliveries…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load deliveries."}
        </p>
      )}

      {!isLoading && !isError && data ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <DeliveryLogTable logs={data.logs} />
        </div>
      ) : null}

      {data && data.total > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} deliveries
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
