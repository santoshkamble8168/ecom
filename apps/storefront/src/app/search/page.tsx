"use client";

import type { SearchSuggestion } from "@ecom/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<string[]>([]);

  const fetchSuggestions = useCallback(async (q: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/search/suggestions?q=${encodeURIComponent(q)}`,
    );
    const body = await res.json();
    if (body.success) setSuggestions(body.data.suggestions);
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/search/trending`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setTrending(body.data.terms);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void fetchSuggestions(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-display font-bold">Search</h1>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, categories, collections..."
        className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
      />

      {suggestions.length > 0 ? (
        <ul className="mt-6 divide-y divide-neutral-200 dark:divide-neutral-800">
          {suggestions.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="block py-3 hover:text-brand-600">
                <span className="text-xs uppercase text-neutral-400">{s.type}</span> {s.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : query ? (
        <p className="mt-6 text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
      ) : (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-neutral-500">Trending searches</p>
          <div className="flex flex-wrap gap-2">
            {trending.map((term) => (
              <button
                key={term}
                type="button"
                className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200 dark:bg-neutral-800"
                onClick={() => setQuery(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-neutral-500">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
