"use client";

import type {
  AnalyticsKpiSnapshot,
  CohortSnapshot,
  FunnelSnapshot,
  ProductAnalyticsSnapshot,
  SearchAnalyticsSnapshot,
} from "@ecom/types";
import {
  Card,
  CardContent,
  CohortTable,
  FunnelChart,
  KpiCard,
  ReportFilter,
  SearchAnalyticsCard,
} from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

function rangeQuery(from: string, to: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function AdminAnalyticsPage() {
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = rangeQuery(from, to);

  const kpis = useQuery({
    queryKey: ["admin-analytics-kpis", from, to],
    queryFn: () => apiFetch<AnalyticsKpiSnapshot>(`/admin/analytics/kpis${query}`),
  });
  const funnels = useQuery({
    queryKey: ["admin-analytics-funnels", from, to],
    queryFn: () => apiFetch<FunnelSnapshot>(`/admin/analytics/funnels${query}`),
  });
  const search = useQuery({
    queryKey: ["admin-analytics-search", from, to],
    queryFn: () => apiFetch<SearchAnalyticsSnapshot>(`/admin/analytics/search${query}`),
  });
  const products = useQuery({
    queryKey: ["admin-analytics-products", from, to],
    queryFn: () => apiFetch<ProductAnalyticsSnapshot>(`/admin/analytics/products${query}`),
  });
  const cohorts = useQuery({
    queryKey: ["admin-analytics-cohorts", from, to],
    queryFn: () => apiFetch<CohortSnapshot>(`/admin/analytics/cohorts${query}`),
  });

  const loading = kpis.isLoading || funnels.isLoading || search.isLoading || products.isLoading || cohorts.isLoading;
  const error = kpis.error ?? funnels.error ?? search.error ?? products.error ?? cohorts.error;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Analytics</h1>
        <p className="text-sm text-neutral-500">KPIs, conversion funnel, search, products, and first-order cohorts.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportFilter
            from={fromInput}
            to={toInput}
            onFromChange={setFromInput}
            onToChange={setToInput}
            onApply={() => {
              setFrom(fromInput);
              setTo(toInput);
            }}
          />
        </CardContent>
      </Card>

      {loading ? <p className="text-neutral-500">Loading analytics…</p> : null}
      {error ? (
        <p className="text-danger-600">{error instanceof Error ? error.message : "Failed to load analytics."}</p>
      ) : null}

      {kpis.data ? (
        kpis.data.kpis.length === 0 ? (
          <p className="text-neutral-500">No KPIs available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.data.kpis.map((kpi) => (
              <KpiCard key={kpi.key} label={kpi.label} value={kpi.value} definition={kpi.definition} />
            ))}
          </div>
        )
      ) : null}

      {funnels.data ? <FunnelChart steps={funnels.data.steps} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {search.data ? <SearchAnalyticsCard snapshot={search.data} /> : null}
        {products.data ? (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <h2 className="text-lg font-semibold">Products</h2>
              {products.data.products.length === 0 ? (
                <p className="text-sm text-neutral-500">No product events in this range.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800">
                      <th scope="col" className="py-2 font-medium text-neutral-500">
                        Product
                      </th>
                      <th scope="col" className="py-2 font-medium text-neutral-500">
                        Views
                      </th>
                      <th scope="col" className="py-2 font-medium text-neutral-500">
                        Add to cart
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.data.products.map((row) => (
                      <tr key={row.productSlug} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-2 font-mono text-neutral-900 dark:text-neutral-50">{row.productSlug}</td>
                        <td className="py-2 tabular-nums text-neutral-500">{row.views}</td>
                        <td className="py-2 tabular-nums text-neutral-500">{row.addToCart}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {cohorts.data ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h2 className="text-lg font-semibold">First-order cohorts</h2>
            <p className="text-sm text-neutral-500">
              Buyers grouped by the UTC month of their first paid order in the selected range.
            </p>
            <CohortTable cohorts={cohorts.data.cohorts} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
