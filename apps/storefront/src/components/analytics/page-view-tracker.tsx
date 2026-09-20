"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { configureAnalytics, track } from "@ecom/analytics";

import { CONSENT_CHANGED_EVENT, hasAnalyticsConsent } from "@/lib/consent";
import { getToken } from "@/lib/auth";

export function AnalyticsPageView() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const consented = hasAnalyticsConsent();
      configureAnalytics({
        endpoint: "/api/v1/analytics/events",
        getAuthToken: getToken,
        enabled: consented,
        debug: process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true",
      });
      setAllowed(consented);
    };
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    track("page_view", undefined, pathname);
  }, [pathname, allowed]);

  return null;
}
