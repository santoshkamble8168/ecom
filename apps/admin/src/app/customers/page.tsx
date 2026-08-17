"use client";

import type { AdminCustomerListResult } from "@ecom/types";
import { Card, CardContent } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { CustomerStatusPill } from "@/components/customers/customer-status-pill";
import { apiFetchWithMeta } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["active", "suspended", "pending_verification"] as const;

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export default function CustomersPage() {
  const [status, setStatus] = useState<"" | (typeof STATUS_OPTIONS)[number]>("");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-customers", { status, q, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<AdminCustomerListResult>(
        `/admin/customers?${params.toString()}`,
      );
      return result.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Customers</h1>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <form
            className="flex flex-1 min-w-[220px] flex-col gap-1 sm:flex-row sm:items-end sm:gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setQ(searchInput.trim());
            }}
          >
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">Search</span>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Name, email, or phone"
                className={INPUT_CLASS}
              />
            </label>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Search
            </button>
          </form>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setPage(1);
              }}
              className={INPUT_CLASS}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading customers…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load customers."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Orders</th>
                <th className="px-4 py-3 text-left font-semibold">Lifetime value</th>
                <th className="px-4 py-3 text-left font-semibold">Last order</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.customers.map((customer) => (
                <tr key={customer.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3">
                    <p className="font-medium">{customer.displayName ?? "—"}</p>
                    <p className="text-neutral-500">{customer.email ?? "—"}</p>
                    {customer.phone ? <p className="text-neutral-500">{customer.phone}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <CustomerStatusPill status={customer.status} />
                  </td>
                  <td className="px-4 py-3">{customer.orderCount}</td>
                  <td className="px-4 py-3">{formatCurrency(customer.lifetimeValue)}</td>
                  <td className="px-4 py-3">{formatDate(customer.lastOrderAt)}</td>
                  <td className="px-4 py-3">{formatDate(customer.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${customer.id}`} className="text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.customers.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No customers found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} customers
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
    </div>
  );
}
