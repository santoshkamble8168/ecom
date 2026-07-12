import { Suspense } from "react";

import { PlpView } from "@/components/discovery/plp-view";

export default function MenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
      <PlpView title="Men" description="Shop men's tees and essentials" apiPath="/categories/men/products" />
    </Suspense>
  );
}
