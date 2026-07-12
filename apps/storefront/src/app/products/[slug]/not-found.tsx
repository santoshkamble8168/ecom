import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-display font-bold">Product not found</h1>
      <p className="mt-2 text-neutral-500">This product may have been removed or is no longer available.</p>
      <div className="mt-6 flex justify-center gap-4">
        <Link href="/men" className="text-brand-700 hover:underline">
          Shop Men
        </Link>
        <Link href="/collections/new-arrivals" className="text-brand-700 hover:underline">
          New Arrivals
        </Link>
      </div>
    </div>
  );
}
