"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PlpView } from "@/components/discovery/plp-view";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(searchParams.toString());
    if (query.trim()) sp.set("q", query.trim());
    else sp.delete("q");
    sp.delete("page");
    router.push(`?${sp.toString()}`);
  }

  return (
    <>
      <form onSubmit={handleSearch} className="mx-auto max-w-2xl px-4 pt-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </form>
      {searchParams.get("q") && (
        <PlpView title="Search" apiPath="/search" searchMode />
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
