import { Suspense } from "react";
import type { Metadata } from "next";

import { PlpView } from "@/components/discovery/plp-view";

export const metadata: Metadata = {
  title: "T-Shirts",
  description: "Shop everyday cotton tees — classic crew, oversized graphics, and women’s fits.",
  alternates: { canonical: "/t-shirts" },
};

export default function TShirtsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView
        title="T-Shirts"
        description="Everyday cotton tees. Classic, oversized, and easy fits."
        apiPath="/products"
      />
    </Suspense>
  );
}
