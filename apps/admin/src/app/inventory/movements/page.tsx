"use client";

import type { StockMovementSummary, WarehouseSummary } from "@ecom/types";
import { Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { apiFetch, apiFetchWithMeta } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface MovementListResult {
  movements: StockMovementSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

const MOVEMENT_TYPE_LABELS: Record<StockMovementSummary["type"], string> = {
  purchase_in: "Purchase In",
  sale_out: "Sale Out",
  return_in: "Return In",
  adjustment_in: "Adjustment In",
  adjustment_out: "Adjustment Out",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  reservation: "Reservation",
  release: "Release",
};

export default function StockMovementsPage() {
  const [warehouseId, setWarehouseId] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [page, setPage] = useState(1);

  const { data: warehouses } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: () => apiFetch<WarehouseSummary[]>("/admin/warehouses"),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-stock-movements", { warehouseId, variantSku, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.set("warehouseId", warehouseId);
      if (variantSku) params.set("variantSku", variantSku);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<MovementListResult>(`/admin/stock/movements?${params.toString()}`);
      return result.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Inventory · Stock Movements</h1>
        <Link href="/inventory" className="text-sm text-brand-600 hover:underline">
          ← Back to stock
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <form
            className="flex flex-1 min-w-[220px] items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setVariantSku(skuInput.trim());
            }}
          >
            <VariantSearchField
              label="Variant SKU"
              value={skuInput}
              onChange={setSkuInput}
              onPick={(hit) => {
                setSkuInput(hit.sku);
                setVariantSku(hit.sku);
                setPage(1);
              }}
            />
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Search
            </button>
          </form>

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

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load stock movements."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold">Reference</th>
                <th className="px-4 py-3 text-left font-semibold">Note</th>
                <th className="px-4 py-3 text-left font-semibold">Actor</th>
              </tr>
            </thead>
            <tbody>
              {data?.movements.map((movement) => (
                <tr key={movement.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 text-neutral-500">{formatDateTime(movement.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{movement.variantSku}</td>
                  <td className="px-4 py-3">{MOVEMENT_TYPE_LABELS[movement.type]}</td>
                  <td className="px-4 py-3">{movement.quantity}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {movement.referenceType ? `${movement.referenceType} · ${movement.referenceId ?? "—"}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{movement.note ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-neutral-500">{movement.actorType}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.movements.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No stock movements found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} movements
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
    </div>
  );
}
