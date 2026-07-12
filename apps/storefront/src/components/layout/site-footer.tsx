import type { NavigationSummary } from "@ecom/types";
import Link from "next/link";

import { NewsletterForm } from "@/components/home/newsletter-form";

interface SiteFooterProps {
  navigation: NavigationSummary;
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-400">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-neutral-400 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "X", href: "https://twitter.com" },
];

const PAYMENT_METHODS = ["Visa", "Mastercard", "UPI", "Net Banking", "COD"];

export function SiteFooter({ navigation }: SiteFooterProps) {
  return (
    <footer className="bg-neutral-950 text-neutral-300">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-14 sm:grid-cols-4">
        <FooterColumn title="Customer Service" links={navigation.footer.support} />
        <FooterColumn title="Company" links={navigation.footer.legal} />
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-400">
            Connect With Us
          </h3>
          <ul className="flex flex-col gap-2.5">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-neutral-400 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-400">
            Keep Up To Date
          </h3>
          <p className="text-sm text-neutral-400">Sign up for restocks, drops, and member-only offers.</p>
          <NewsletterForm placeholder="Enter email address" ctaLabel="Subscribe" />
        </div>
      </div>

      {navigation.footer.shop.length > 0 && (
        <div className="border-t border-neutral-800">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 text-xs text-neutral-500">
            <span className="font-semibold uppercase tracking-wide text-neutral-400">Shop</span>
            {navigation.footer.shop.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-neutral-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-display font-bold text-white">
            ECOM<span className="text-accent-400">.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
            <span>100% secure payments</span>
            {PAYMENT_METHODS.map((method) => (
              <span key={method} className="rounded border border-neutral-700 px-2 py-0.5">
                {method}
              </span>
            ))}
          </div>
          <p className="text-xs text-neutral-500">&copy; {new Date().getFullYear()} ECOM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
