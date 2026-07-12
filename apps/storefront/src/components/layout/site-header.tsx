"use client";

import type { NavigationSummary, SearchSuggestion } from "@ecom/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getToken } from "@/lib/auth";
import { fetchCart } from "@/lib/cart";

interface SiteHeaderProps {
  navigation: NavigationSummary;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m20 20-3.2-3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-9.9-9A5.5 5.5 0 0 1 12 5.6a5.5 5.5 0 0 1 9.9 5.9c-2.4 4.4-9.9 9-9.9 9Z"
      />
    </svg>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h12l-1 12H7L6 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a3 3 0 1 1 6 0v2" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}

export function SiteHeader({ navigation }: SiteHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

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
    setSignedIn(Boolean(getToken()));
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
    if (!searchFocused) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/search/trending`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setTrending(body.data.terms);
      });
  }, [searchFocused]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchSuggestions(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function submitSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchFocused(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const announcement = navigation.announcement;
  const dropdownOpen = searchFocused && (suggestions.length > 0 || trending.length > 0 || query.length > 0);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
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

          <Link href="/" className="shrink-0 text-xl font-display font-bold tracking-tight">
            ECOM<span className="text-accent-500">.</span>
          </Link>

          <nav className="hidden shrink-0 gap-5 md:flex" aria-label="Primary">
            {navigation.header.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold uppercase tracking-wide text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div ref={searchBoxRef} className="relative ml-auto hidden max-w-md flex-1 sm:block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch(query);
              }}
              placeholder="Search for products, brands and more"
              className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
            />

            {dropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-full rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
                {suggestions.length > 0 ? (
                  <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {suggestions.map((s) => (
                      <li key={s.href}>
                        <Link
                          href={s.href}
                          className="block px-1 py-2 text-sm hover:text-brand-600"
                          onClick={() => setSearchFocused(false)}
                        >
                          <span className="mr-2 text-xs uppercase text-neutral-400">{s.type}</span>
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : query ? (
                  <p className="px-1 py-2 text-sm text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
                ) : trending.length > 0 ? (
                  <div>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase text-neutral-400">Trending</p>
                    <div className="flex flex-wrap gap-2 px-1">
                      {trending.map((term) => (
                        <button
                          key={term}
                          type="button"
                          className="rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800"
                          onClick={() => submitSearch(term)}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-4 sm:ml-0">
            <Link
              href="/search"
              aria-label="Search"
              className="text-neutral-700 sm:hidden dark:text-neutral-300"
            >
              <SearchIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/account"
              aria-label="Account"
              className="hidden items-center gap-1.5 text-neutral-700 hover:text-neutral-950 sm:flex dark:text-neutral-300 dark:hover:text-white"
            >
              <UserIcon className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                {signedIn ? "Account" : "Login"}
              </span>
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              <HeartIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              <BagIcon className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {announcement && (
          <div className="bg-accent-600 py-2 text-center text-xs font-medium text-white">
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
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 bg-white p-6 dark:bg-neutral-950" aria-label="Mobile">
            <button type="button" className="mb-6" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              ✕
            </button>
            <div className="relative mb-6">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                placeholder="Search products"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submitSearch((e.target as HTMLInputElement).value);
                    setMenuOpen(false);
                  }
                }}
                className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              />
            </div>
            <ul className="flex flex-col gap-4">
              {navigation.header.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-lg font-semibold uppercase tracking-wide"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <Link href="/account" className="flex items-center gap-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                <UserIcon className="h-5 w-5" /> {signedIn ? "Account" : "Login"}
              </Link>
              <Link href="/wishlist" className="flex items-center gap-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                <HeartIcon className="h-5 w-5" /> Wishlist
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
