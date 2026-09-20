import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">404</p>
      <h1 className="text-3xl font-display font-bold">Page not found</h1>
      <p className="max-w-md text-neutral-700 dark:text-neutral-300">
        The page you are looking for doesn&apos;t exist or has moved. Continue shopping or go back home.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/collections/new-arrivals"
          className="inline-flex min-h-12 items-center rounded-md bg-accent-500 px-6 text-base font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
        >
          Shop now
        </Link>
        <Link href="/" className="min-h-12 inline-flex items-center text-brand-800 underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
