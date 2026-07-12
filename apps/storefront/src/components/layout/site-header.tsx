import Link from "next/link";

const NAV_LINKS = [
  { href: "/men", label: "Men" },
  { href: "/women", label: "Women" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/best-sellers", label: "Best Sellers" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-sticky border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      {/* brand-700, not brand-600, so white text clears the WCAG AA 4.5:1 contrast threshold */}
      <div className="bg-brand-700 py-2 text-center text-xs font-medium text-white">
        Free shipping on orders above ₹999
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="text-xl font-display font-bold">
          ECOM
        </Link>
        <nav className="hidden gap-6 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-neutral-700 hover:text-brand-600 dark:text-neutral-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/search" aria-label="Search">
            Search
          </Link>
          <Link href="/wishlist" aria-label="Wishlist">
            Wishlist
          </Link>
          <Link href="/cart" aria-label="Cart">
            Cart
          </Link>
          <Link href="/account" aria-label="Account">
            Account
          </Link>
        </div>
      </div>
    </header>
  );
}
