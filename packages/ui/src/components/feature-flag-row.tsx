import { cn } from "../lib/cn";

import { StatusPill } from "./status-pill";

export interface FeatureFlagRowFlag {
  key: string;
  isEnabled: boolean;
  description: string | null;
  environment: string;
  rolloutPercent: number;
}

export interface FeatureFlagRowProps {
  flag: FeatureFlagRowFlag;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export function FeatureFlagRow({ flag, onToggle, className }: FeatureFlagRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              role="switch"
              checked={flag.isEnabled}
              disabled={!onToggle}
              onChange={(event) => onToggle?.(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-brand-600"
            />
            <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-50">{flag.key}</span>
          </label>
          <StatusPill label={flag.environment} tone="brand" />
        </div>
        {flag.description ? <p className="mt-1 text-sm text-neutral-500">{flag.description}</p> : null}
      </div>
      <p className="text-sm text-neutral-500">
        Rollout <span className="font-medium text-neutral-700 dark:text-neutral-300">{flag.rolloutPercent}%</span>
      </p>
    </div>
  );
}
