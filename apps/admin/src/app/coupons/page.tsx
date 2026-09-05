"use client";

import type { CouponSummary, UpsertCouponInput } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { CouponForm } from "@/components/promotions/coupon-form";
import { apiFetchWithMeta, apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface CouponListResult {
  coupons: CouponSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-coupons", { isActive, code, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isActive) params.set("isActive", isActive);
      if (code) params.set("code", code);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const result = await apiFetchWithMeta<CouponListResult>(`/admin/coupons?${params.toString()}`);
      return result.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: UpsertCouponInput) =>
      apiFetch<CouponSummary>("/admin/coupons", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      setCreateError(null);
      setShowCreate(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive: nextIsActive }: { id: string; isActive: boolean }) =>
      apiFetch<CouponSummary>(`/admin/coupons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextIsActive }),
      }),
    onSuccess: () => {
      setToggleError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: Error) => setToggleError(err.message),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Coupons"
        description="Create, edit, and activate discount codes."
        actions={
          <Button type="button" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "Create Coupon"}
          </Button>
        }
      />

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Coupon</CardTitle>
          </CardHeader>
          <CardContent>
            <CouponForm
              submitLabel="Create Coupon"
              isSubmitting={createMutation.isPending}
              error={createError}
              onSubmit={(input) => createMutation.mutate(input)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <form
            className="flex flex-1 min-w-[220px] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setCode(codeInput.trim());
            }}
          >
            <input
              type="text"
              placeholder="Search coupon code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
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
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as "" | "true" | "false");
              setPage(1);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All coupons</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </CardContent>
      </Card>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load coupons."}
        </p>
      )}
      {toggleError && <p className="text-danger-600">{toggleError}</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Value</th>
                <th className="px-4 py-3 text-left font-semibold">Used / Max</th>
                <th className="px-4 py-3 text-left font-semibold">Per-user limit</th>
                <th className="px-4 py-3 text-left font-semibold">Combinable</th>
                <th className="px-4 py-3 text-left font-semibold">Expires</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data?.coupons.map((coupon) => (
                <tr key={coupon.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{coupon.code}</td>
                  <td className="px-4 py-3 capitalize">{coupon.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {coupon.type === "percent"
                      ? `${coupon.value}%`
                      : coupon.type === "fixed"
                        ? formatCurrency(coupon.value)
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.usedCount} / {coupon.maxUses ?? "∞"}
                  </td>
                  <td className="px-4 py-3">{coupon.perUserLimit ?? "∞"}</td>
                  <td className="px-4 py-3">{coupon.combinable ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{formatDate(coupon.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={toggleActiveMutation.isPending}
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: coupon.id, isActive: !coupon.isActive })
                      }
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        coupon.isActive
                          ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/coupons/${coupon.id}`} className="text-brand-600 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.coupons.length === 0 && (
            <p className="p-6 text-center text-neutral-500">No coupons found.</p>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            Page {data.page} of {totalPages} · {data.total} coupons
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
