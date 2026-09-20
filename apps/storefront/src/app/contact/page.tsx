import type { Metadata } from "next";

import { CmsRoutedPage } from "@/components/cms/cms-routed-page";
import { ContactForm } from "@/components/contact/contact-form";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

const FALLBACK = {
  title: "Contact us",
  description: "Get in touch with Ecom support about orders, shipping, and returns.",
  path: "/contact",
};

export async function generateMetadata(): Promise<Metadata> {
  return metadataForCmsSlug("contact", FALLBACK);
}

export default async function ContactPage() {
  return (
    <CmsRoutedPage
      slug="contact"
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-3xl font-display font-bold">Contact us</h1>
          <p className="mt-3 text-neutral-700 dark:text-neutral-300">
            We typically reply within one business day. For order tracking, use the Track order page.
          </p>
        </div>
      }
      extra={
        <div className="mx-auto max-w-3xl px-4 pb-12">
          <ContactForm />
        </div>
      }
    />
  );
}
