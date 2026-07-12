import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-32 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        The page you are looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="text-brand-600 underline">
        Back to home
      </Link>
    </div>
  );
}
