import type { Metadata } from "next";

import { StreetwearHomepage } from "@/components/home/streetwear-homepage";
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
  return <StreetwearHomepage />;
}
