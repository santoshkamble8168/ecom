"use client";

import type { NavigationSummary, SearchSuggestion } from "@ecom/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getToken } from "@/lib/auth";
import { fetchCart } from "@/lib/cart";
import { getApiUrl } from "@/lib/api-url";

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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [bagBounce, setBagBounce] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const bagBounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCartCount = useCallback(async () => {
    try {
      const cart = await fetchCart();
      setCartCount(cart.itemCount);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
    const syncAuth = () => setSignedIn(Boolean(getToken()));
    window.addEventListener("storage", syncAuth);
    window.addEventListener("focus", syncAuth);
    window.addEventListener("auth-changed", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, [pathname]);

  useEffect(() => {
    void refreshCartCount();
    const handler = () => {
      void refreshCartCount();
      setBagBounce(true);
      if (bagBounceTimer.current) clearTimeout(bagBounceTimer.current);
      bagBounceTimer.current = setTimeout(() => setBagBounce(false), 600);
    };
    window.addEventListener("cart-updated", handler);
    return () => {
      window.removeEventListener("cart-updated", handler);
      if (bagBounceTimer.current) clearTimeout(bagBounceTimer.current);
    };
  }, [refreshCartCount]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(
      `${getApiUrl()}/search/suggestions?q=${encodeURIComponent(q)}`,
    );
    const body = await res.json();
    if (body.success) setSuggestions(body.data.suggestions);
  }, []);

  useEffect(() => {
    if (!searchFocused) return;
    fetch(`${getApiUrl()}/search/trending`)
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

          <Link
            href="/"
            className="shrink-0 rounded-sm bg-accent-500 px-2 py-1 text-xl font-display font-bold tracking-tight text-neutral-950"
          >
            ECOM
          </Link>

          <nav className="hidden shrink-0 gap-5 md:flex" aria-label="Primary">
            {navigation.header.map((link) => (
              <div key={link.href} className="group relative">
                <Link
                  href={link.href}
                  className="text-sm font-semibold uppercase tracking-wide text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
                >
                  {link.label}
                </Link>
                {link.children && link.children.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-10 min-w-[180px] rounded-md border border-neutral-200 bg-white py-2 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-neutral-800 dark:bg-neutral-950">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm normal-case text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
              aria-label="Search products"
              className="w-full rounded-sm border border-brand-200 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-800 dark:bg-neutral-900"
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
              aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
              id="site-header-bag"
              data-bag-target="true"
              className={`relative text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white ${
                bagBounce ? "animate-bag-bounce" : ""
              }`}
            >
              <BagIcon className="h-5 w-5" />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white animate-pop"
                >
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {announcement && (
          <div className="bg-brand-500 py-2 text-center text-xs font-medium text-white">
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
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
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
                  {link.children && link.children.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-2 border-l border-neutral-200 pl-4 dark:border-neutral-800">
                      {link.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="text-sm font-medium text-neutral-600 dark:text-neutral-400"
                            onClick={() => setMenuOpen(false)}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
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
