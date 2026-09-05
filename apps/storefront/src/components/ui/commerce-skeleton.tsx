export function CommerceSkeleton({
  className = "mx-auto max-w-6xl px-4 py-8",
  rows = 3,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="h-24 w-24 shrink-0 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
