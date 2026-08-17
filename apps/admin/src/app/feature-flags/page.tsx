"use client";

import type { FeatureFlagEnvironment, FeatureFlagRecord } from "@ecom/types";
import { FeatureFlagRow } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const ENVIRONMENTS: FeatureFlagEnvironment[] = ["all", "development", "test", "production"];

function FlagEditor({ flag }: { flag: FeatureFlagRecord }) {
  const queryClient = useQueryClient();
  const [rollout, setRollout] = useState(String(flag.rolloutPercent));
  const [enabled, setEnabled] = useState(flag.isEnabled);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: {
      isEnabled?: boolean;
      environment?: FeatureFlagEnvironment;
      rolloutPercent?: number;
    }) =>
      apiFetch<FeatureFlagRecord>(`/admin/feature-flags/${encodeURIComponent(flag.key)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (updated) => {
      setError(null);
      setEnabled(updated.isEnabled);
      setRollout(String(updated.rolloutPercent));
      void queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
    },
    onError: (err: Error) => {
      setEnabled(flag.isEnabled);
      setRollout(String(flag.rolloutPercent));
      setError(err.message);
    },
  });

  function commitRollout() {
    const parsed = Number(rollout);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      setError("Rollout must be an integer between 0 and 100.");
      setRollout(String(flag.rolloutPercent));
      return;
    }
    if (parsed === flag.rolloutPercent) return;
    mutation.mutate({ rolloutPercent: parsed });
  }

  return (
    <div className="flex flex-col gap-2">
      <FeatureFlagRow
        flag={{ ...flag, isEnabled: enabled }}
        onToggle={(isEnabled) => {
          setEnabled(isEnabled);
          mutation.mutate({ isEnabled });
        }}
      />
      <div className="flex flex-wrap items-end gap-3 px-1">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Environment</span>
          <select
            value={flag.environment}
            disabled={mutation.isPending}
            aria-label={`Environment for ${flag.key}`}
            onChange={(event) =>
              mutation.mutate({ environment: event.target.value as FeatureFlagEnvironment })
            }
            className={INPUT_CLASS}
          >
            {ENVIRONMENTS.map((environment) => (
              <option key={environment} value={environment}>
                {environment}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Rollout %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={rollout}
            disabled={mutation.isPending}
            aria-label={`Rollout percent for ${flag.key}`}
            onChange={(event) => setRollout(event.target.value)}
            onBlur={commitRollout}
            className={`${INPUT_CLASS} w-24`}
          />
        </label>
      </div>
      {error ? <p className="px-1 text-sm text-danger-600">{error}</p> : null}
    </div>
  );
}

export default function FeatureFlagsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: () => apiFetch<FeatureFlagRecord[]>("/admin/feature-flags"),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Feature flags</h1>

      {isLoading && <p className="text-neutral-500">Loading feature flags…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load feature flags."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col gap-4">
          {data?.length === 0 ? (
            <p className="text-neutral-500">No feature flags found.</p>
          ) : (
            data?.map((flag) => <FlagEditor key={`${flag.id}:${flag.updatedAt}`} flag={flag} />)
          )}
        </div>
      )}
    </div>
  );
}
