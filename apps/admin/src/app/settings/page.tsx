"use client";

import type { PlatformSetting } from "@ecom/types";
import { Card, CardContent, SettingsForm, type SettingsFormValues } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

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

      {isLoading && <p className="text-neutral-500">Loading settings…</p>}
      {isError && (
        <p className="text-danger-600">
          {loadError instanceof Error ? loadError.message : "Failed to load settings."}
        </p>
      )}

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
