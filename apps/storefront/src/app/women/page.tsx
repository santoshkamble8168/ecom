import { Suspense } from "react";
import type { Metadata } from "next";

import { PlpView } from "@/components/discovery/plp-view";

export const metadata: Metadata = {
  title: "Women",
  description: "Shop women's tees and essentials",
  alternates: { canonical: "/women" },
};

export default function WomenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView title="Women" description="Shop women's tees and essentials" apiPath="/categories/women/products" />
    </Suspense>
  );
}
