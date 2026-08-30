import { Suspense } from "react";
import type { Metadata } from "next";

import { PlpView } from "@/components/discovery/plp-view";

export const metadata: Metadata = {
  title: "Men",
  description: "Shop men's tees and essentials",
  alternates: { canonical: "/men" },
};

export default function MenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView title="Men" description="Shop men's tees and essentials" apiPath="/categories/men/products" />
    </Suspense>
  );
}
