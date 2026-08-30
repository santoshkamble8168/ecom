"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { track } from "@ecom/analytics";

export function AnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view", undefined, pathname);
  }, [pathname]);

  return null;
}
