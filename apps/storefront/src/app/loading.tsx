export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-24" role="status" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-4 w-96 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
