"use client";

import type { StockItemSummary, WarehouseSummary } from "@ecom/types";
import { Button, Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";
import { LowStockBanner } from "@/components/inventory/low-stock-banner";
import { LowStockBadge } from "@/components/inventory/status-badges";
import { TransferStockModal } from "@/components/inventory/transfer-stock-modal";
import { apiFetch, apiFetchWithMeta } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface StockListResult {
  stockItems: StockItemSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function InventoryStockPage() {
  const [warehouseId, setWarehouseId] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const { data: warehouses } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: () => apiFetch<WarehouseSummary[]>("/admin/warehouses"),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-stock", { warehouseId, variantSku, lowStockOnly, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.set("warehouseId", warehouseId);
      if (variantSku) params.set("variantSku", variantSku);
      if (lowStockOnly) params.set("lowStockOnly", "true");
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<StockListResult>(`/admin/stock?${params.toString()}`);
      return result.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Inventory · Stock</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowTransferModal(true)}
            disabled={!warehouses || warehouses.length < 2}
          >
            Transfer Stock
          </Button>
          <Button type="button" onClick={() => setShowAdjustModal(true)} disabled={!warehouses || warehouses.length === 0}>
            Adjust Stock
          </Button>
        </div>
      </div>

      <LowStockBanner />

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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            Low stock only
          </label>
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load stock."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Warehouse</th>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-semibold">Product</th>
                <th className="px-4 py-3 text-left font-semibold">On Hand</th>
                <th className="px-4 py-3 text-left font-semibold">Reserved</th>
                <th className="px-4 py-3 text-left font-semibold">Available</th>
                <th className="px-4 py-3 text-left font-semibold">Updated</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.stockItems.map((item) => (
                <tr key={item.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{item.warehouseCode}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.variantSku}</td>
                  <td className="px-4 py-3">{item.productTitle ?? "—"}</td>
                  <td className="px-4 py-3">{item.onHand}</td>
                  <td className="px-4 py-3">{item.reserved}</td>
                  <td className="px-4 py-3">{item.available}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDateTime(item.updatedAt)}</td>
                  <td className="px-4 py-3">{item.isLowStock && <LowStockBadge />}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.stockItems.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No stock items found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} items
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

      <p className="text-sm text-neutral-500">
        Manage <Link href="/inventory/warehouses" className="text-brand-600 hover:underline">warehouses</Link>,{" "}
        <Link href="/inventory/suppliers" className="text-brand-600 hover:underline">suppliers</Link>, and{" "}
        <Link href="/inventory/purchase-orders" className="text-brand-600 hover:underline">purchase orders</Link>. View the{" "}
        <Link href="/inventory/movements" className="text-brand-600 hover:underline">stock movement ledger</Link>.
      </p>

      {showAdjustModal && warehouses && (
        <AdjustStockModal warehouses={warehouses} onClose={() => setShowAdjustModal(false)} />
      )}
      {showTransferModal && warehouses && (
        <TransferStockModal warehouses={warehouses} onClose={() => setShowTransferModal(false)} />
      )}
    </div>
  );
}
