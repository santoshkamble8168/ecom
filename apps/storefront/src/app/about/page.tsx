import type { Metadata } from "next";
import Link from "next/link";

import { CmsRoutedPage } from "@/components/cms/cms-routed-page";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

const FALLBACK = {
  title: "About Ecom",
  description: "Ecom is a production-grade apparel storefront for everyday tees and essentials.",
  path: "/about",
};

export async function generateMetadata(): Promise<Metadata> {
  return metadataForCmsSlug("about", FALLBACK);
}

export default async function AboutPage() {
  return (
    <CmsRoutedPage
      slug="about"
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-3xl font-display font-bold">About Ecom</h1>
          <p className="mt-4 text-neutral-700 dark:text-neutral-300">
            We design and sell premium tees with secure checkout, fast shipping on orders above ₹999, and
            straightforward returns.
          </p>
          <Link
            href="/collections/new-arrivals"
            className="mt-8 inline-flex min-h-12 items-center rounded-md bg-accent-500 px-6 text-base font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
          >
            Shop now
          </Link>
        </div>
      }
    />
  );
}
