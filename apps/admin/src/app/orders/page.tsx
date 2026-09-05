"use client";

import type { AdminOrderListResult, OrderStatus } from "@ecom/types";
import { Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { OrderStatusBadge } from "@/components/orders/status-badges";
import { apiFetchWithMeta } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "return_requested",
  "returned",
  "exchange_requested",
  "exchanged",
  "cancelled",
  "failed",
];

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-orders", { status, q, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<AdminOrderListResult>(`/admin/orders?${params.toString()}`);
      return result.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Orders"
        description="Filter by status or search, then open an order to fulfill, refund, or update status."
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <form
            className="flex flex-1 min-w-[220px] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQ(searchInput.trim());
            }}
          >
            <input
              type="text"
              placeholder="Search order # or customer email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Search
            </button>
          </form>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus | "");
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All statuses</option>
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load orders."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Order #</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Items</th>
                <th className="px-4 py-3 text-left font-semibold">Total</th>
                <th className="px-4 py-3 text-left font-semibold">Payment</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.orders.map((order) => (
                <tr key={order.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customerName ?? "—"}</p>
                    <p className="text-neutral-500">{order.customerEmail ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">{order.itemCount}</td>
                  <td className="px-4 py-3">{formatCurrency(order.total, order.currency)}</td>
                  <td className="px-4 py-3">
                    <p className="capitalize">{order.paymentMethod}</p>
                    <p className="text-neutral-500">{order.paymentStatus ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.orders.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No orders found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} orders
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
