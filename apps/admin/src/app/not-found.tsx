import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link href="/" className="text-brand-600 underline">
        Back to dashboard
      </Link>
    </div>
  );
}
