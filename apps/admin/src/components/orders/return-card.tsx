"use client";

import type { ReturnRequestSummary } from "@ecom/types";
import { Button } from "@ecom/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

import { ReturnStatusBadge } from "./status-badges";

type ReturnAction = "approve" | "reject" | "receive" | "refund";

export function ReturnCard({ request, orderId }: { request: ReturnRequestSummary; orderId: string }) {
  const queryClient = useQueryClient();
  const [refundAmount, setRefundAmount] = useState(request.refundAmount ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resolveMutation = useMutation({
    mutationFn: (action: ReturnAction) =>
      apiFetch(`/admin/returns/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          refundAmount:
            (action === "approve" || action === "refund") && refundAmount ? refundAmount : undefined,
          note: note || undefined,
        }),
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
        <ReturnStatusBadge status={request.status} />
      </div>

      <ul className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {request.items.map((item) => (
          <li key={item.variantSku}>
            {item.variantSku} × {item.quantity}
          </li>
        ))}
      </ul>

      {request.comments && (
        <p className="mt-2 text-sm text-neutral-500">Customer comments: {request.comments}</p>
      )}
      {request.refundAmount && (
        <p className="mt-2 text-sm text-neutral-500">Refund amount: {request.refundAmount}</p>
      )}
      {request.resolvedAt && (
        <p className="mt-1 text-sm text-neutral-500">Resolved {formatDate(request.resolvedAt)}</p>
      )}

      {(request.status === "requested" || request.status === "item_received") && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {(request.status === "requested" || request.status === "item_received") && (
            <input
              type="text"
              placeholder="Refund amount override (optional)"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-56 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          )}
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-56 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />

          {request.status === "requested" && (
            <>
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
            </>
          )}

          {request.status === "item_received" && (
            <Button
              type="button"
              size="sm"
              onClick={() => resolveMutation.mutate("refund")}
              disabled={resolveMutation.isPending}
            >
              Process refund
            </Button>
          )}
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

      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
