import type { Metadata } from "next";

import { CmsRoutedPage } from "@/components/cms/cms-routed-page";
import { PolicyDocument } from "@/components/legal/policy-document";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

const FALLBACK = {
  title: "Shipping Policy",
  description: "Delivery timelines, shipping charges, and pincode serviceability for Ecom orders.",
  path: "/shipping",
};

export async function generateMetadata(): Promise<Metadata> {
  return metadataForCmsSlug("shipping", FALLBACK);
}

export default async function ShippingPage() {
  return (
    <CmsRoutedPage
      slug="shipping"
      fallback={
        <PolicyDocument title="Shipping Policy">
          <p>Standard delivery takes 4–7 business days. Express delivery takes 2–4 business days where available.</p>
        </PolicyDocument>
      }
    />
  );
}
