"use client";

import type { ExchangeRequestSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

import { ExchangeStatusBadge } from "./status-badges";

type ExchangeAction = "approve" | "reject" | "receive" | "complete";

export function ExchangeCard({ request, orderId }: { request: ExchangeRequestSummary; orderId: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resolveMutation = useMutation({
    mutationFn: (action: ExchangeAction) =>
      apiFetch(`/admin/exchanges/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, note: note || undefined }),
      }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{request.reasonLabel}</p>
          <p className="text-sm text-neutral-500">Requested {formatDate(request.requestedAt)}</p>
        </div>
        <ExchangeStatusBadge status={request.status} />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-neutral-600 dark:text-neutral-400 sm:grid-cols-2">
        <div>
          <p className="font-medium text-neutral-700 dark:text-neutral-300">Original items</p>
          <ul>
            {request.originalItems.map((item) => (
              <li key={item.variantSku}>
                {item.variantSku} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-neutral-700 dark:text-neutral-300">Desired items</p>
          <ul>
            {request.desiredItems.map((item) => (
              <li key={item.variantSku}>
                {item.variantSku} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {request.comments && (
        <p className="mt-2 text-sm text-neutral-500">Customer comments: {request.comments}</p>
      )}
      {request.resolvedAt && (
        <p className="mt-1 text-sm text-neutral-500">Resolved {formatDate(request.resolvedAt)}</p>
      )}

      {request.status === "requested" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-56 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => resolveMutation.mutate("approve")}
            disabled={resolveMutation.isPending}
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => resolveMutation.mutate("reject")}
            disabled={resolveMutation.isPending}
          >
            Reject
          </Button>
        </div>
      )}

      {request.status === "approved" && (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => resolveMutation.mutate("receive")}
            disabled={resolveMutation.isPending}
          >
            Mark item received
          </Button>
        </div>
      )}

      {request.status === "item_received" && (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            onClick={() => resolveMutation.mutate("complete")}
            disabled={resolveMutation.isPending}
          >
            Complete exchange
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
