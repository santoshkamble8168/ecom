import type { Metadata } from "next";

import { CmsRoutedPage } from "@/components/cms/cms-routed-page";
import { PolicyDocument } from "@/components/legal/policy-document";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

const FALLBACK = {
  title: "Privacy Policy",
  description:
    "How Ecom collects, uses, and protects personal data for shopping, checkout, cookies, and analytics.",
  path: "/privacy",
};

export async function generateMetadata(): Promise<Metadata> {
  return metadataForCmsSlug("privacy-policy", FALLBACK);
}

export default async function PrivacyPage() {
  return (
    <CmsRoutedPage
      slug="privacy-policy"
      fallback={
        <PolicyDocument title="Privacy Policy">
          <p>Last updated: 20 September 2026</p>
          <p>
            Ecom collects only the information needed to process orders, prevent fraud, and improve the
            shopping experience. We do not sell personal data.
          </p>
        </PolicyDocument>
      }
    />
  );
}
