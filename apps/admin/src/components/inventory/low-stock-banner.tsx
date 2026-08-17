"use client";

import type { LowStockAlert } from "@ecom/types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

export function LowStockBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: alerts } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: () => apiFetch<LowStockAlert[]>("/admin/stock/low-stock"),
  });

  if (dismissed || !alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-warning-500/30 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
      <div>
        <p className="font-medium">
          {alerts.length} item{alerts.length === 1 ? "" : "s"} running low on stock
        </p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {alerts.slice(0, 5).map((alert) => (
            <li key={`${alert.warehouseId}-${alert.variantSku}`}>
              {alert.productTitle ?? alert.variantSku} ({alert.variantSku}) at {alert.warehouseName}: {alert.available}{" "}
              available (threshold {alert.lowStockThreshold})
            </li>
          ))}
          {alerts.length > 5 && <li>…and {alerts.length - 5} more</li>}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss low stock alert"
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium hover:bg-warning-500/10"
      >
        Dismiss
      </button>
    </div>
  );
}
