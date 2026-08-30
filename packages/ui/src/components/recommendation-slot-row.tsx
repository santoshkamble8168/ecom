import type { RecommendationSlotConfig, RecommendationStrategy } from "@ecom/types";
import { RECOMMENDATION_STRATEGIES } from "@ecom/types";

import { cn } from "../lib/cn";

export interface RecommendationSlotRowProps {
  slot: RecommendationSlotConfig;
  saving?: boolean;
  onChange: (patch: Partial<RecommendationSlotConfig>) => void;
  onSave: () => void;
  className?: string;
}

export function RecommendationSlotRow({
  slot,
  saving = false,
  onChange,
  onSave,
  className,
}: RecommendationSlotRowProps) {
  return (
    <div
      className={cn(
        "grid gap-3 border-b border-neutral-200 py-4 dark:border-neutral-800 md:grid-cols-[1fr_8rem_6rem_1fr_auto] md:items-end",
        className,
      )}
    >
      <div>
        <p className="font-medium">{slot.title}</p>
        <p className="font-mono text-xs text-neutral-500">{slot.slot}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Strategy</span>
        <select
          value={slot.strategy}
          disabled={saving}
          aria-label={`Strategy for ${slot.slot}`}
          onChange={(event) => onChange({ strategy: event.target.value as RecommendationStrategy })}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {RECOMMENDATION_STRATEGIES.map((strategy) => (
            <option key={strategy} value={strategy}>
              {strategy}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={slot.isEnabled}
          disabled={saving}
          aria-label={`Enable ${slot.slot}`}
          onChange={(event) => onChange({ isEnabled: event.target.checked })}
        />
        Enabled
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Fallback slugs</span>
        <input
          value={slot.fallbackProductSlugs.join(", ")}
          disabled={saving}
          aria-label={`Fallback products for ${slot.slot}`}
          onChange={(event) =>
            onChange({
              fallbackProductSlugs: event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
