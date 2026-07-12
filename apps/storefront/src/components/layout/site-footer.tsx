import type { NavigationSummary } from "@ecom/types";
import Link from "next/link";

interface SiteFooterProps {
  navigation: NavigationSummary;
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-neutral-600 hover:text-brand-600 dark:text-neutral-400">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ navigation }: SiteFooterProps) {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-lg font-display font-bold">ECOM</p>
          <p className="mt-2 text-sm text-neutral-500">
            Premium apparel for everyday style.
          </p>
        </div>
        <FooterColumn title="Shop" links={navigation.footer.shop} />
        <FooterColumn title="Support" links={navigation.footer.support} />
        <FooterColumn title="Legal" links={navigation.footer.legal} />
      </div>
      <div className="border-t border-neutral-200 px-4 py-4 text-center text-sm text-neutral-500 dark:border-neutral-800">
        &copy; {new Date().getFullYear()} Ecom. All rights reserved.
      </div>
    </footer>
  );
}
