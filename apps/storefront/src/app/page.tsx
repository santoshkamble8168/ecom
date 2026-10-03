import type { Metadata } from "next";

import { CmsPageView } from "@/components/cms/cms-page-view";
import { StreetwearHomepage } from "@/components/home/streetwear-homepage";
import { getPublishedCmsPage } from "@/lib/cms";
import { metadataForCmsSlug } from "@/lib/cms-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await metadataForCmsSlug("home", {
    title: "Ecom | T-Shirts Made for Every Day",
    description:
      "Clean cotton tees for everyday wear. Classic crew, oversized graphics, and easy returns. Free shipping above ₹999.",
    path: "/",
  });
  return { ...meta, title: { absolute: typeof meta.title === "string" ? meta.title : "Ecom | T-Shirts Made for Every Day" } };
}

export default async function HomePage() {
  const page = await getPublishedCmsPage("home");
  if (!page) return <StreetwearHomepage />;
  return <CmsPageView page={page} />;
}
