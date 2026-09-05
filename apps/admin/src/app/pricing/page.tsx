"use client";

import type { PriceListSummary, ProductPriceSummary } from "@ecom/types";
import { Button, Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { VariantSearchField } from "@/components/catalog/variant-search-field";
import { EditPriceModal } from "@/components/pricing/edit-price-modal";
import { SimulatePricePanel } from "@/components/pricing/simulate-price-panel";
import { SaleActiveBadge } from "@/components/pricing/status-badges";
import { apiFetch, apiFetchWithMeta } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface PriceListResult {
  prices: ProductPriceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function PricingPage() {
  const [priceListId, setPriceListId] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [page, setPage] = useState(1);
  const [editingPrice, setEditingPrice] = useState<ProductPriceSummary | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: priceLists } = useQuery({
    queryKey: ["admin-price-lists"],
    queryFn: () => apiFetch<PriceListSummary[]>("/admin/price-lists"),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-prices", { priceListId, variantSku, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (priceListId) params.set("priceListId", priceListId);
      if (variantSku) params.set("variantSku", variantSku);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<PriceListResult>(`/admin/prices?${params.toString()}`);
      return result.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Pricing · Prices</h1>
        <div className="flex items-center gap-3">
          <Link href="/pricing/price-lists" className="text-sm text-brand-600 hover:underline">
            Price Lists
          </Link>
          <Link href="/pricing/tax-rules" className="text-sm text-brand-600 hover:underline">
            Tax Rules
          </Link>
          <Button type="button" onClick={() => setShowCreateModal(true)} disabled={!priceLists?.length}>
            Set Price
          </Button>
        </div>
      </div>

      <SimulatePricePanel />

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
            value={priceListId}
            onChange={(e) => {
              setPriceListId(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All price lists</option>
            {priceLists?.map((priceList) => (
              <option key={priceList.id} value={priceList.id}>
                {priceList.code} — {priceList.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load prices."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-semibold">MRP</th>
                <th className="px-4 py-3 text-left font-semibold">Selling Price</th>
                <th className="px-4 py-3 text-left font-semibold">Sale Price</th>
                <th className="px-4 py-3 text-left font-semibold">Effective Price</th>
                <th className="px-4 py-3 text-left font-semibold">Sale</th>
                <th className="px-4 py-3 text-left font-semibold">Updated</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.prices.map((price) => (
                <tr key={price.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{price.variantSku}</td>
                  <td className="px-4 py-3">{formatCurrency(price.mrp)}</td>
                  <td className="px-4 py-3">{formatCurrency(price.sellingPrice)}</td>
                  <td className="px-4 py-3">{price.salePrice ? formatCurrency(price.salePrice) : "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(price.effectivePrice)}</td>
                  <td className="px-4 py-3">
                    <SaleActiveBadge active={price.saleActive} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDateTime(price.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setEditingPrice(price)}
                      className="text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.prices.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No prices found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} prices
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

      {editingPrice && priceLists && (
        <EditPriceModal existing={editingPrice} priceLists={priceLists} onClose={() => setEditingPrice(null)} />
      )}
      {showCreateModal && priceLists && (
        <EditPriceModal existing={null} priceLists={priceLists} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
