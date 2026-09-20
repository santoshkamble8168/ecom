import type { Metadata } from "next";

import { CmsRoutedPage } from "@/components/cms/cms-routed-page";
import { PolicyDocument } from "@/components/legal/policy-document";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

const FALLBACK = {
  title: "Terms and Conditions",
  description: "Terms of sale, returns, and acceptable use for shopping on Ecom.",
  path: "/terms",
};

export async function generateMetadata(): Promise<Metadata> {
  return metadataForCmsSlug("terms", FALLBACK);
}

export default async function TermsPage() {
  return (
    <CmsRoutedPage
      slug="terms"
      fallback={
        <PolicyDocument title="Terms and Conditions">
          <p>Last updated: 20 September 2026</p>
          <p>By placing an order on Ecom you agree to these terms of sale.</p>
        </PolicyDocument>
      }
    />
  );
}
