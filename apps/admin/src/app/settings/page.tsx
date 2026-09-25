"use client";

import type { PlatformSetting } from "@ecom/types";
import { Card, CardContent, SettingsForm, type SettingsFormValues } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

interface ShippingMethodSetting {
  code: string;
  label: string;
  baseFee: string;
  isActive: boolean;
}

function ShippingFeeCard() {
  const queryClient = useQueryClient();
  const [fee, setFee] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-shipping-methods"],
    queryFn: () => apiFetch<ShippingMethodSetting[]>("/admin/shipping-methods"),
  });

  const standard = data?.find((method) => method.code === "standard") ?? data?.[0];

  const mutation = useMutation({
    mutationFn: () => {
      if (!standard) throw new Error("No shipping method to update");
      const amount = Number(fee ?? standard.baseFee);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a shipping fee of 0 or more");
      return apiFetch<{ code: string; baseFee: string }>(`/admin/shipping-methods/${standard.code}`, {
        method: "PATCH",
        body: JSON.stringify({ baseFee: amount }),
      });
    },
    onSuccess: () => {
      setError(null);
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["admin-shipping-methods"] });
    },
    onError: (err: Error) => {
      setSaved(false);
      setError(err.message);
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold">Shipping fee</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Charged on every order. Customers do not pick a delivery option. Free-shipping coupons still waive this fee.
        </p>
        {isLoading && <p className="mt-4 text-sm text-neutral-500">Loading shipping fee…</p>}
        {isError && <p className="mt-4 text-sm text-danger-600">Could not load the shipping fee.</p>}
        {standard && (
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSaved(false);
              mutation.mutate();
            }}
          >
            <label className="text-sm">
              <span className="text-neutral-500">Fee (INR)</span>
              <input
                className="mt-1 block w-40 rounded-md border border-neutral-300 px-3 py-2"
                inputMode="decimal"
                value={fee ?? standard.baseFee}
                onChange={(event) => {
                  setFee(event.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save shipping fee
            </button>
          </form>
        )}
        {saved ? <p className="mt-3 text-sm text-success-600">Shipping fee saved. New checkouts use this amount.</p> : null}
        {error ? <p className="mt-3 text-sm text-danger-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

const KNOWN_SETTINGS: Array<{ key: string; fallback: string | boolean }> = [
  { key: "store.name", fallback: "" },
  { key: "store.currency", fallback: "INR" },
  { key: "store.timezone", fallback: "Asia/Kolkata" },
  { key: "store.maintenanceMode", fallback: false },
  { key: "seo.defaultTitle", fallback: "" },
  { key: "notifications.emailEnabled", fallback: true },
];

function toFormSettings(settings: PlatformSetting[]) {
  return KNOWN_SETTINGS.map(({ key, fallback }) => {
    const found = settings.find((setting) => setting.key === key);
    const value = found?.value ?? fallback;
    if (typeof fallback === "boolean") {
      return { key, value: typeof value === "boolean" ? value : fallback };
    }
    return { key, value: value == null ? fallback : String(value) };
  });
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => apiFetch<PlatformSetting[]>("/admin/settings"),
  });

  const mutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      apiFetch<PlatformSetting[]>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ settings: values }),
      }),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: Error) => {
      setSaved(false);
      setError(err.message);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Settings</h1>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {loadError instanceof Error ? loadError.message : "Failed to load settings."}
        </p>
      )}

      <ShippingFeeCard />

      {data ? (
        <Card>
          <CardContent className="pt-6">
            <SettingsForm
              key={data.map((setting) => `${setting.key}:${setting.updatedAt}`).join("|")}
              settings={toFormSettings(data)}
              onSubmit={(values) => {
                setSaved(false);
                mutation.mutate(values);
              }}
            />
            {saved ? <p className="mt-3 text-sm text-success-600">Settings saved.</p> : null}
            {error ? <p className="mt-3 text-sm text-danger-600">{error}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
