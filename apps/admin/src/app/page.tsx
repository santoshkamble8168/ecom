"use client";

import type { DashboardSnapshot } from "@ecom/types";
import { AlertCard, Button, Card, CardContent, DashboardChart, KpiCard } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export default function AdminDashboardPage() {
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dashboard", { from, to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      if (to) params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      const query = params.toString();
      return apiFetch<DashboardSnapshot>(`/admin/dashboard${query ? `?${query}` : ""}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        {data ? (
          <p className="text-sm text-neutral-500">Updated {formatDateTime(data.generatedAt)}</p>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setFrom(fromInput);
              setTo(toInput);
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">From</span>
              <input
                type="date"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">To</span>
              <input
                type="date"
                value={toInput}
                onChange={(event) => setToInput(event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <Button type="submit" variant="secondary" size="sm">
              Apply range
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && <p className="text-neutral-500">Loading dashboard…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load dashboard."}
        </p>
      )}

      {data ? (
        <>
          {data.kpis.length === 0 ? (
            <p className="text-neutral-500">No KPIs available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.kpis.map((kpi) => (
                <KpiCard
                  key={kpi.key}
                  label={kpi.label}
                  value={kpi.value}
                  definition={kpi.definition}
                  deltaLabel={kpi.deltaLabel}
                  tone={kpi.tone ?? "neutral"}
                />
              ))}
            </div>
          )}

          {data.charts.length === 0 ? (
            <p className="text-neutral-500">No charts available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {data.charts.map((chart) => (
                <DashboardChart
                  key={chart.key}
                  label={chart.label}
                  points={chart.points}
                  unit={chart.unit}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <h2 className="text-base font-semibold">Alerts</h2>
                {data.alerts.length === 0 ? (
                  <p className="text-sm text-neutral-500">No alerts.</p>
                ) : (
                  data.alerts.map((alert) => (
                    <AlertCard
                      key={alert.key}
                      severity={alert.severity}
                      title={alert.title}
                      detail={alert.detail}
                      href={alert.href}
                    />
                  ))
                )}
              </CardContent>
            </Card>
            <ActivityFeed activity={data.activity} />
          </div>
        </>
      ) : null}
    </div>
  );
}
