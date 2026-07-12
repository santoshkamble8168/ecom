export default function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-32 w-full animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
