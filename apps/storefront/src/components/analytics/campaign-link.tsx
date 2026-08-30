"use client";

import { track } from "@ecom/analytics";
import Link from "next/link";
import type { ReactNode } from "react";

export function CampaignLink({
  href,
  campaignId,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  campaignId?: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => track("campaign_click", { campaignId: campaignId ?? href, href })}
    >
      {children}
    </Link>
  );
}
