"use client";

import type { PurchaseOrderStatus, PurchaseOrderSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { PurchaseOrderStatusBadge } from "@/components/inventory/status-badges";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const NEXT_STATUSES: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["ordered", "cancelled"],
  ordered: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const poId = params.id;
  const queryClient = useQueryClient();

  const [nextStatus, setNextStatus] = useState<PurchaseOrderStatus | "">("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [receiveError, setReceiveError] = useState<string | null>(null);

  const { data: po, isLoading, isError, error } = useQuery({
    queryKey: ["admin-purchase-order", poId],
    queryFn: () => apiFetch<PurchaseOrderSummary>(`/admin/purchase-orders/${poId}`),
    enabled: Boolean(poId),
  });

  const allowedNextStatuses = useMemo(() => (po ? NEXT_STATUSES[po.status] : []), [po]);

  const statusMutation = useMutation({
    mutationFn: (status: PurchaseOrderStatus) =>
      apiFetch<PurchaseOrderSummary>(`/admin/purchase-orders/${poId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (updated) => {
      setStatusError(null);
      setNextStatus("");
      queryClient.setQueryData(["admin-purchase-order", poId], updated);
      void queryClient.invalidateQueries({ queryKey: ["admin-purchase-orders"] });
    },
    onError: (err: Error) => setStatusError(err.message),
  });

  const receiveMutation = useMutation({
    mutationFn: (items: Array<{ variantSku: string; quantityReceived: number }>) =>
      apiFetch<PurchaseOrderSummary>(`/admin/purchase-orders/${poId}/receive`, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    onSuccess: (updated) => {
      setReceiveError(null);
      setReceiveQuantities({});
      queryClient.setQueryData(["admin-purchase-order", poId], updated);
      void queryClient.invalidateQueries({ queryKey: ["admin-purchase-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
    },
    onError: (err: Error) => setReceiveError(err.message),
  });

  if (isLoading) {
    return <p className="text-neutral-500">Loading purchase order…</p>;
  }

  if (isError || !po) {
    return (
      <p className="text-danger-600">
        {error instanceof Error ? error.message : "Purchase order not found."}
      </p>
    );
  }

  const canReceive = po.status === "ordered" || po.status === "partially_received";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold">Purchase Order {po.poNumber}</h1>
            <PurchaseOrderStatusBadge status={po.status} />
          </div>
          <p className="text-sm text-neutral-500">Created {formatDateTime(po.createdAt)}</p>
        </div>
        <Link href="/inventory/purchase-orders" className="text-sm text-brand-600 hover:underline">
          ← Back to purchase orders
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium">Supplier:</span> {po.supplierName}
            </p>
            <p>
              <span className="font-medium">Warehouse:</span> {po.warehouseName}
            </p>
            <p>
              <span className="font-medium">Expected:</span> {formatDate(po.expectedAt)}
            </p>
            {po.note && (
              <p>
                <span className="font-medium">Note:</span> {po.note}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            {allowedNextStatuses.length === 0 ? (
              <p className="text-sm text-neutral-500">This purchase order is in a terminal state.</p>
            ) : (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!nextStatus) {
                    setStatusError("Select a status to apply.");
                    return;
                  }
                  statusMutation.mutate(nextStatus);
                }}
              >
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as PurchaseOrderStatus | "")}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <option value="">Select status…</option>
                  {allowedNextStatuses.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" disabled={statusMutation.isPending}>
                  {statusMutation.isPending ? "Updating…" : "Update Status"}
                </Button>
              </form>
            )}
            {statusError && <p className="mt-2 text-sm text-danger-600">{statusError}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">SKU</th>
                  <th className="px-3 py-2 text-left font-medium">Ordered</th>
                  <th className="px-3 py-2 text-left font-medium">Received</th>
                  <th className="px-3 py-2 text-left font-medium">Remaining</th>
                  <th className="px-3 py-2 text-left font-medium">Unit Cost</th>
                  {canReceive && <th className="px-3 py-2 text-left font-medium">Receive Now</th>}
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => {
                  const remaining = item.quantityOrdered - item.quantityReceived;
                  return (
                    <tr key={item.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-3 py-2 font-mono text-xs">{item.variantSku}</td>
                      <td className="px-3 py-2">{item.quantityOrdered}</td>
                      <td className="px-3 py-2">{item.quantityReceived}</td>
                      <td className="px-3 py-2">{remaining}</td>
                      <td className="px-3 py-2">{formatCurrency(item.unitCost)}</td>
                      {canReceive && (
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            placeholder="0"
                            disabled={remaining <= 0}
                            value={receiveQuantities[item.variantSku] ?? ""}
                            onChange={(e) =>
                              setReceiveQuantities((prev) => ({ ...prev, [item.variantSku]: e.target.value }))
                            }
                            className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 disabled:opacity-50"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canReceive && (
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => {
                  const itemsToReceive = po.items
                    .map((item) => ({
                      variantSku: item.variantSku,
                      quantityReceived: Number(receiveQuantities[item.variantSku] ?? 0),
                    }))
                    .filter((item) => item.quantityReceived > 0);

                  if (itemsToReceive.length === 0) {
                    setReceiveError("Enter a quantity to receive for at least one line item.");
                    return;
                  }
                  receiveMutation.mutate(itemsToReceive);
                }}
                disabled={receiveMutation.isPending}
                className="w-fit"
              >
                {receiveMutation.isPending ? "Receiving…" : "Receive Items"}
              </Button>
              {receiveError && <p className="text-sm text-danger-600">{receiveError}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
