import { cn } from "../lib/cn";

export interface NotificationPreferenceRowProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

/** Labeled switch for a customer notification preference (marketing or transactional). */
export function NotificationPreferenceRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  className,
}: NotificationPreferenceRowProps) {
  const isDisabled = Boolean(disabled) || !onChange;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <label className={cn("flex items-center gap-2", isDisabled ? "cursor-not-allowed" : "cursor-pointer")}>
          <input
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={isDisabled}
            onChange={(event) => onChange?.(event.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 accent-brand-600"
          />
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{label}</span>
        </label>
        {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
      </div>
    </div>
  );
}
