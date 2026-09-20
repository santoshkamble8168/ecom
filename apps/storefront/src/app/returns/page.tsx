import type { Metadata } from "next";

import { CmsRoutedPage } from "@/components/cms/cms-routed-page";
import { PolicyDocument } from "@/components/legal/policy-document";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

const FALLBACK = {
  title: "Returns and Exchanges",
  description: "How to return or exchange an Ecom order within 7 days of delivery.",
  path: "/returns",
};

export async function generateMetadata(): Promise<Metadata> {
  return metadataForCmsSlug("returns", FALLBACK);
}

export default async function ReturnsPage() {
  return (
    <CmsRoutedPage
      slug="returns"
      fallback={
        <PolicyDocument title="Returns and Exchanges">
          <p>Request a return within 7 days of delivery for unused items in original condition.</p>
        </PolicyDocument>
      }
    />
  );
}
