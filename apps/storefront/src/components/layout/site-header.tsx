"use client";

import type { NavigationSummary, SearchSuggestion } from "@ecom/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchCart } from "@/lib/cart";

interface SiteHeaderProps {
  navigation: NavigationSummary;
}

export function SiteHeader({ navigation }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    try {
      const cart = await fetchCart();
      setCartCount(cart.itemCount);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshCartCount();
    const handler = () => void refreshCartCount();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [refreshCartCount]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/search/suggestions?q=${encodeURIComponent(q)}`,
    );
    const body = await res.json();
    if (body.success) setSuggestions(body.data.suggestions);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/search/trending`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setTrending(body.data.terms);
      });
  }, [searchOpen]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchSuggestions(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  const announcement = navigation.announcement;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        {announcement && (
          <div className="bg-brand-700 py-2 text-center text-xs font-medium text-white">
            {announcement.message}
            {announcement.linkUrl && announcement.linkLabel && (
              <>
                {" · "}
                <Link href={announcement.linkUrl} className="underline">
                  {announcement.linkLabel}
                </Link>
              </>
            )}
          </div>
        )}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button
            type="button"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="text-xl font-display font-bold">
            ECOM
          </Link>

          <nav className="hidden gap-6 md:flex" aria-label="Primary">
            {navigation.header.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-700 hover:text-brand-600 dark:text-neutral-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              aria-label="Search"
              className="font-medium text-neutral-700 hover:text-brand-600 dark:text-neutral-300"
              onClick={() => setSearchOpen(true)}
            >
              Search
            </button>
            <Link href="/wishlist" aria-label="Wishlist" className="hidden sm:inline">
              Wishlist
            </Link>
            <Link href="/cart" aria-label="Cart" className="relative">
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/account" aria-label="Account" className="hidden sm:inline">
              Account
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 bg-white p-6 dark:bg-neutral-950" aria-label="Mobile">
            <button type="button" className="mb-6" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              ✕
            </button>
            <ul className="flex flex-col gap-3">
              {navigation.header.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-lg font-medium" onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-neutral-950">
          <div className="mx-auto max-w-2xl px-4 py-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Search</h2>
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}>
                ✕
              </button>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories..."
              autoFocus
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
            />
            {suggestions.length > 0 ? (
              <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                {suggestions.map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className="block py-3 text-sm hover:text-brand-600"
                      onClick={() => setSearchOpen(false)}
                    >
                      <span className="text-xs uppercase text-neutral-400">{s.type}</span> {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : query ? (
              <p className="mt-4 text-sm text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Trending</p>
                <div className="flex flex-wrap gap-2">
                  {trending.map((term) => (
                    <button
                      key={term}
                      type="button"
                      className="rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800"
                      onClick={() => setQuery(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
