"use client";

import type { NavigationSummary, SearchSuggestion } from "@ecom/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CheckoutProgress } from "@/components/checkout/checkout-steps";
import { decodeJwtPayload, ensureAccessToken, getToken, hasSession, signOut } from "@/lib/auth";
import { fetchCart } from "@/lib/cart";
import { useCheckoutStep } from "@/lib/checkout-step";
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

const ACCOUNT_LINKS = [
  { href: "/account?tab=orders", label: "Orders" },
  { href: "/account?tab=wishlist", label: "Wishlist" },
  { href: "/account?tab=addresses", label: "Addresses" },
  { href: "/account?tab=profile", label: "Profile" },
  { href: "/account?tab=preferences", label: "Notifications" },
  { href: "/track", label: "Track order" },
] as const;

function AccountMenu({
  email,
  onNavigate,
  onSignOut,
}: {
  email?: string;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Account"
      className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-white py-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Account</p>
        <p className="mt-1 truncate text-sm font-semibold text-neutral-950 dark:text-white">{email ?? "Signed in"}</p>
      </div>
      <div className="py-1">
        {ACCOUNT_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            className="block px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="border-t border-neutral-100 pt-1 dark:border-neutral-800">
        <button
          type="button"
          role="menuitem"
          className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-danger-600 hover:bg-danger-50"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function SiteHeader({ navigation }: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const checkoutStep = useCheckoutStep();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [bagBounce, setBagBounce] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | undefined>();
  const [accountOpen, setAccountOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
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
    const syncAuth = () => {
      setSignedIn(hasSession());
      const token = getToken();
      setAccountEmail(token ? decodeJwtPayload(token)?.email : undefined);
    };
    syncAuth();
    void ensureAccessToken().finally(syncAuth);
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
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function submitSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchFocused(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const announcement = navigation.announcement;
  const dropdownOpen = searchFocused && (suggestions.length > 0 || trending.length > 0 || query.length > 0);
  const onCart = pathname === "/cart" || pathname.startsWith("/cart/");
  const onCheckout = pathname === "/checkout" || pathname.startsWith("/checkout/");
  const minimal = onCart || onCheckout;
  async function handleSignOut() {
    setAccountOpen(false);
    setMenuOpen(false);
    await signOut();
    router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/95">
        {announcement && !minimal && (
          <div className="border-b border-neutral-200 bg-neutral-950 py-2 text-center text-xs font-medium tracking-wide text-white">
            {announcement.message}
            {announcement.linkUrl && announcement.linkLabel && (
              <>
                {" · "}
                <Link href={announcement.linkUrl} className="underline underline-offset-2">
                  {announcement.linkLabel}
                </Link>
              </>
            )}
          </div>
        )}
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-8">
          {!minimal && (
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          )}

          <Link
            href="/"
            className="shrink-0 text-lg font-display font-semibold tracking-[0.18em] text-neutral-950 dark:text-white"
          >
            ECOM
          </Link>

          {minimal && (
            <CheckoutProgress current={onCart ? "bag" : checkoutStep} className="min-w-0 flex-1" />
          )}

          {!minimal && (
          <nav className="hidden shrink-0 gap-6 md:flex" aria-label="Primary">
            {navigation.header.map((link) => (
              <div key={link.href} className="group relative">
                <Link
                  href={link.href}
                  className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
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
          )}

          {!minimal && (
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
              placeholder="Search tees"
              aria-label="Search products"
              className="w-full rounded-none border-0 border-b border-neutral-300 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-neutral-500 focus:border-neutral-950 focus:outline-none focus:ring-0 dark:border-neutral-700 dark:bg-transparent"
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
          )}

          <div className={`flex items-center gap-1 sm:gap-3 ${minimal ? "" : "ml-auto sm:ml-0"}`}>
            {!minimal && (
              <Link
                href="/search"
                aria-label="Search"
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-800 sm:hidden dark:text-neutral-200"
              >
                <SearchIcon className="h-5 w-5" />
              </Link>
            )}
            {onCart && !signedIn ? (
              <button
                type="button"
                aria-label="Login"
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
                onClick={() => window.dispatchEvent(new Event("open-cart-login"))}
              >
                <UserIcon className="h-5 w-5 animate-login-nudge" />
                <span className="hidden text-xs font-semibold uppercase tracking-wide sm:inline">Login</span>
              </button>
            ) : signedIn ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className={`${minimal ? "inline-flex" : "hidden sm:inline-flex"} min-h-11 items-center gap-1.5 px-2 text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white`}
                  onClick={() => setAccountOpen((open) => !open)}
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="hidden text-xs font-semibold uppercase tracking-wide sm:inline">Account</span>
                </button>
                {accountOpen && (
                  <AccountMenu email={accountEmail} onNavigate={() => setAccountOpen(false)} onSignOut={() => void handleSignOut()} />
                )}
              </div>
            ) : (
              <Link
                href={onCheckout ? `/account?next=${encodeURIComponent("/checkout")}` : "/account"}
                aria-label="Login"
                className={`${minimal ? "inline-flex" : "hidden sm:flex"} min-h-11 items-center gap-1.5 px-2 text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white`}
              >
                <UserIcon className="h-5 w-5" />
                <span className="hidden text-xs font-semibold uppercase tracking-wide sm:inline">Login</span>
              </Link>
            )}
            {!minimal && (
              <Link
                href="/account?tab=wishlist"
                aria-label="Wishlist"
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
              >
                <HeartIcon className="h-5 w-5" />
              </Link>
            )}
            {!minimal && (
            <Link
              href="/cart"
              aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
              id="site-header-bag"
              data-bag-target="true"
              className={`relative inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white ${
                bagBounce ? "animate-bag-bounce" : ""
              }`}
            >
              <span className="relative inline-flex">
                <BagIcon className="h-5 w-5" />
                {cartCount > 0 && (
                  <span
                    key={cartCount}
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold leading-none text-white animate-pop"
                  >
                    {cartCount}
                  </span>
                )}
              </span>
            </Link>
            )}
          </div>
        </div>
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
            <div className="mt-8 flex flex-col gap-1 border-t border-neutral-200 pt-6 dark:border-neutral-800">
              {signedIn ? (
                <>
                  <p className="px-2 pb-2 text-xs text-neutral-500">{accountEmail ?? "Signed in"}</p>
                  {ACCOUNT_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="rounded-md px-2 py-2.5 text-left text-sm font-semibold text-danger-600 hover:bg-danger-50"
                    onClick={() => void handleSignOut()}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/account" className="flex items-center gap-2 px-2 py-2.5 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                  <UserIcon className="h-5 w-5" /> Login
                </Link>
              )}
              {!signedIn && (
                <Link href="/account?tab=wishlist" className="flex items-center gap-2 px-2 py-2.5 text-sm font-medium" onClick={() => setMenuOpen(false)}>
                  <HeartIcon className="h-5 w-5" /> Wishlist
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
