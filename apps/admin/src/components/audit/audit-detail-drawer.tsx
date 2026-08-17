"use client";

import type { AuditLogEntry } from "@ecom/types";
import { Button } from "@ecom/ui";
import { useEffect, useRef } from "react";

import { formatDateTime } from "@/lib/format";

function formatJson(value: unknown): string {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditDetailDrawer({
  log,
  onClose,
}: {
  log: AuditLogEntry;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close audit detail"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="audit-detail-title" className="text-lg font-semibold">
              {log.action}
            </h2>
            <p className="text-sm text-neutral-500">{formatDateTime(log.createdAt)}</p>
          </div>
          <Button ref={closeRef} type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <dl className="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-neutral-500">Actor</dt>
            <dd>{log.actorEmail ?? log.actorId ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">Entity</dt>
            <dd>
              {log.entityType}
              {log.entityId ? ` · ${log.entityId}` : ""}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">Correlation ID</dt>
            <dd className="break-all font-mono text-xs">{log.correlationId ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-500">IP address</dt>
            <dd>{log.ipAddress ?? "—"}</dd>
          </div>
        </dl>

        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">Before</h3>
          <pre className="overflow-x-auto rounded-md bg-neutral-50 p-3 text-xs dark:bg-neutral-800">
            {formatJson(log.before)}
          </pre>
        </section>
        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">After</h3>
          <pre className="overflow-x-auto rounded-md bg-neutral-50 p-3 text-xs dark:bg-neutral-800">
            {formatJson(log.after)}
          </pre>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">Metadata</h3>
          <pre className="overflow-x-auto rounded-md bg-neutral-50 p-3 text-xs dark:bg-neutral-800">
            {formatJson(log.metadata)}
          </pre>
        </section>
      </div>
    </div>
  );
}
