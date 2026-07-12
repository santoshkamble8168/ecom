import { Suspense } from "react";

import { PlpView } from "@/components/discovery/plp-view";

export default function WomenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView title="Women" description="Shop women's tees and essentials" apiPath="/categories/women/products" />
    </Suspense>
  );
}
