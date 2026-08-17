"use client";

import type { AuditLogEntry, AuditLogListResult } from "@ecom/types";
import { Button, Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AuditDetailDrawer } from "@/components/audit/audit-detail-drawer";
import { apiDownload, apiFetchWithMeta } from "@/lib/api";
import { fromDatetimeLocalValue } from "@/lib/datetime";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 20;
const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

interface AuditFilters {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: AuditFilters = {
  actorId: "",
  action: "",
  entityType: "",
  entityId: "",
  correlationId: "",
  from: "",
  to: "",
};

function buildQuery(filters: AuditFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  if (filters.correlationId) params.set("correlationId", filters.correlationId);
  const fromIso = fromDatetimeLocalValue(filters.from);
  const toIso = fromDatetimeLocalValue(filters.to);
  if (fromIso) params.set("from", fromIso);
  if (toIso) params.set("to", toIso);
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));
  return params;
}

export default function AuditLogsPage() {
  const [draft, setDraft] = useState<AuditFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-audit-logs", { filters, page }],
    queryFn: async () => {
      const params = buildQuery(filters, page);
      const result = await apiFetchWithMeta<AuditLogListResult>(`/admin/audit-logs?${params.toString()}`);
      return result.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function exportCsv() {
    setExportError(null);
    setExporting(true);
    try {
      const params = buildQuery(filters, page);
      params.delete("page");
      params.delete("pageSize");
      await apiDownload(`/admin/audit-logs/export?${params.toString()}`, "audit-logs.csv");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export audit logs.");
    } finally {
      setExporting(false);
    }
  }

  function updateDraft<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-display font-bold">Audit logs</h1>
        <Button type="button" variant="secondary" onClick={() => void exportCsv()} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>
      {exportError ? <p className="text-sm text-danger-600">{exportError}</p> : null}

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
              <span className="font-medium">Actor ID</span>
              <input
                type="text"
                value={draft.actorId}
                onChange={(event) => updateDraft("actorId", event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Action</span>
              <input
                type="text"
                value={draft.action}
                onChange={(event) => updateDraft("action", event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Entity type</span>
              <input
                type="text"
                value={draft.entityType}
                onChange={(event) => updateDraft("entityType", event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Entity ID</span>
              <input
                type="text"
                value={draft.entityId}
                onChange={(event) => updateDraft("entityId", event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Correlation ID</span>
              <input
                type="text"
                value={draft.correlationId}
                onChange={(event) => updateDraft("correlationId", event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">From</span>
              <input
                type="datetime-local"
                value={draft.from}
                onChange={(event) => updateDraft("from", event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">To</span>
              <input
                type="datetime-local"
                value={draft.to}
                onChange={(event) => updateDraft("to", event.target.value)}
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

      {isLoading && <p className="text-neutral-500">Loading audit logs…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load audit logs."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Time</th>
                <th className="px-4 py-3 text-left font-semibold">Actor</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Entity</th>
                <th className="px-4 py-3 text-left font-semibold">Correlation ID</th>
                <th className="px-4 py-3 text-left font-semibold">IP</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr
                  key={log.id}
                  className="cursor-pointer border-t border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-3">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.actorEmail ?? log.actorId ?? "—"}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.correlationId ?? "—"}</td>
                  <td className="px-4 py-3">{log.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(log);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.logs.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No audit logs found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} logs
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
      )}

      {selected ? <AuditDetailDrawer log={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
