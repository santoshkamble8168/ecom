export function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`} />;
}

/** Full-app placeholder while auth is checked — no “Loading…” splash. */
export function AdminAppSkeleton() {
  return (
    <div className="flex min-h-screen bg-neutral-100" role="status" aria-live="polite" aria-busy="true">
      <aside className="hidden w-64 shrink-0 bg-neutral-950 md:block">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <SkeletonPulse className="h-5 w-28 bg-white/10" />
        </div>
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <SkeletonPulse key={index} className="h-8 w-full bg-white/10" />
          ))}
        </div>
      </aside>
      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto w-full max-w-7xl">
          <AdminPageSkeleton />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function AdminPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite" aria-busy="true">
      <SkeletonPulse className="h-8 w-48" />
      <SkeletonPulse className="h-4 w-80 max-w-full" />
      <AdminTableSkeleton rows={rows} />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <SkeletonPulse className="mb-4 h-10 w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonPulse key={index} className="mb-3 h-12 w-full last:mb-0" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function AdminLoginSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" role="status" aria-live="polite" aria-busy="true">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <SkeletonPulse className="mb-4 h-7 w-40" />
        <SkeletonPulse className="mb-3 h-4 w-full" />
        <SkeletonPulse className="mb-3 h-10 w-full" />
        <SkeletonPulse className="h-10 w-full" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function AdminFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite" aria-busy="true">
      <SkeletonPulse className="h-8 w-56" />
      <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3">
          <SkeletonPulse className="h-10 w-full" />
          <SkeletonPulse className="h-10 w-full" />
          <SkeletonPulse className="h-32 w-full" />
          <SkeletonPulse className="h-10 w-32" />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
