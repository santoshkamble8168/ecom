"use client";

import type { PurchaseOrderStatus, PurchaseOrderSummary, SupplierSummary, WarehouseSummary } from "@ecom/types";
import { Button, Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { CreatePurchaseOrderModal } from "@/components/inventory/create-purchase-order-modal";
import { PurchaseOrderStatusBadge } from "@/components/inventory/status-badges";
import { apiFetch, apiFetchWithMeta } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface PurchaseOrderListResult {
  purchaseOrders: PurchaseOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

const PO_STATUS_OPTIONS: PurchaseOrderStatus[] = [
  "draft",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
];

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState<PurchaseOrderStatus | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: suppliers } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: () => apiFetch<SupplierSummary[]>("/admin/suppliers"),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: () => apiFetch<WarehouseSummary[]>("/admin/warehouses"),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-purchase-orders", { status, supplierId, warehouseId, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (supplierId) params.set("supplierId", supplierId);
      if (warehouseId) params.set("warehouseId", warehouseId);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<PurchaseOrderListResult>(`/admin/purchase-orders?${params.toString()}`);
      return result.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Inventory · Purchase Orders</h1>
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-sm text-brand-600 hover:underline">
            ← Back to stock
          </Link>
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            disabled={!suppliers?.length || !warehouses?.length}
          >
            New Purchase Order
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PurchaseOrderStatus | "");
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All statuses</option>
            {PO_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All suppliers</option>
            {suppliers?.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All warehouses</option>
            {warehouses?.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading purchase orders…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load purchase orders."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">PO #</th>
                <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold">Warehouse</th>
                <th className="px-4 py-3 text-left font-semibold">Items</th>
                <th className="px-4 py-3 text-left font-semibold">Expected</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.purchaseOrders.map((po) => (
                <tr key={po.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.supplierName}</td>
                  <td className="px-4 py-3">{po.warehouseName}</td>
                  <td className="px-4 py-3">{po.items.length}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(po.expectedAt)}</td>
                  <td className="px-4 py-3">
                    <PurchaseOrderStatusBadge status={po.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/purchase-orders/${po.id}`} className="text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.purchaseOrders.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No purchase orders found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} purchase orders
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreateModal && suppliers && warehouses && (
        <CreatePurchaseOrderModal
          suppliers={suppliers}
          warehouses={warehouses}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
