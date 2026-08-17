"use client";

import type { CouponSummary, CouponUsageSummary, UpsertCouponInput } from "@ecom/types";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CouponForm } from "@/components/promotions/coupon-form";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function CouponDetailPage() {
  const params = useParams<{ id: string }>();
  const couponId = params.id;
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    data: coupon,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ["admin-coupon", couponId],
    queryFn: () => apiFetch<CouponSummary>(`/admin/coupons/${couponId}`),
    enabled: Boolean(couponId),
  });

  const {
    data: usages,
    isLoading: usagesLoading,
    isError: usagesError,
  } = useQuery({
    queryKey: ["admin-coupon-usages", couponId],
    queryFn: () => apiFetch<CouponUsageSummary[]>(`/admin/coupons/${couponId}/usages`),
    enabled: Boolean(couponId),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpsertCouponInput) =>
      apiFetch<CouponSummary>(`/admin/coupons/${couponId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (updated) => {
      setError(null);
      queryClient.setQueryData(["admin-coupon", couponId], updated);
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Coupon{coupon ? `: ${coupon.code}` : ""}</h1>
        <Link href="/coupons" className="text-sm text-brand-600 hover:underline">
          ← Back to coupons
        </Link>
      </div>

      {isLoading && <p className="text-neutral-500">Loading coupon…</p>}
      {isError && (
        <p className="text-danger-600">
          {loadError instanceof Error ? loadError.message : "Failed to load coupon."}
        </p>
      )}

      {coupon && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Edit Coupon</CardTitle>
              <span className="text-xs text-neutral-500">Created {formatDateTime(coupon.createdAt)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <CouponForm
              key={coupon.id}
              initial={{ ...coupon, description: coupon.description ?? undefined }}
              submitLabel="Save Changes"
              isSubmitting={updateMutation.isPending}
              error={error}
              onSubmit={(input) => updateMutation.mutate(input)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {usagesLoading && <p className="text-sm text-neutral-500">Loading usages…</p>}
          {usagesError && <p className="text-sm text-danger-600">Failed to load usage history.</p>}
          {!usagesLoading && !usagesError && (
            <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">User</th>
                    <th className="px-3 py-2 text-left font-medium">Order</th>
                    <th className="px-3 py-2 text-left font-medium">Discount amount</th>
                    <th className="px-3 py-2 text-left font-medium">Used at</th>
                  </tr>
                </thead>
                <tbody>
                  {usages?.map((usage) => (
                    <tr key={usage.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-3 py-2">{usage.userId ?? "Guest"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{usage.orderId ?? "—"}</td>
                      <td className="px-3 py-2">{formatCurrency(usage.discountAmount)}</td>
                      <td className="px-3 py-2">{formatDateTime(usage.usedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usages?.length === 0 && (
                <p className="p-6 text-center text-neutral-500">No usages yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
