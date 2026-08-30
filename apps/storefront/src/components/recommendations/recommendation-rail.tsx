"use client";

import { track } from "@ecom/analytics";
import type { RecommendationResult, RecommendationSlot } from "@ecom/types";
import { RecommendationRail } from "@ecom/ui";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/auth";
import { getSessionId } from "@/lib/session";

interface StorefrontRecommendationRailProps {
  slot: RecommendationSlot;
  productSlug?: string;
  title?: string;
  className?: string;
}

export function StorefrontRecommendationRail({
  slot,
  productSlug,
  title,
  className,
}: StorefrontRecommendationRailProps) {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = getSessionId();
    const params = new URLSearchParams();
    if (sessionId) params.set("sessionId", sessionId);
    if (productSlug) params.set("productSlug", productSlug);

    let cancelled = false;
    void apiFetch<RecommendationResult>(`/recommendations/${slot}?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        if (data.products.length > 0) {
          track("recommendation_view", { slot, productCount: data.products.length });
        }
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slot, productSlug]);

  if (!loading && (!result || result.products.length === 0)) {
    return null;
  }

  return (
    <RecommendationRail
      className={className}
      title={title ?? result?.title ?? "Recommended"}
      products={result?.products ?? []}
      loading={loading}
      onProductClick={(slug) => track("recommendation_click", { slot, productSlug: slug })}
    />
  );
}
