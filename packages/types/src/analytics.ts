/** Analytics event taxonomy, ingest payloads, and admin dashboard DTOs. */

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "search",
  "filter",
  "product_view",
  "variant_select",
  "wishlist_add",
  "add_to_cart",
  "checkout_start",
  "payment_attempt",
  "order_placed",
  "review_submit",
  "return_request",
  "campaign_click",
  "recommendation_view",
  "recommendation_click",
  "semantic_search",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const FUNNEL_STEP_KEYS = [
  "homepage",
  "plp",
  "pdp",
  "cart",
  "checkout",
  "payment",
  "order",
] as const;

export type FunnelStepKey = (typeof FUNNEL_STEP_KEYS)[number];

export interface AnalyticsEventInput {
  clientEventId: string;
  name: AnalyticsEventName;
  sessionId: string;
  path?: string;
  occurredAt?: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsIngestRequest {
  events: AnalyticsEventInput[];
}

export interface AnalyticsIngestResult {
  accepted: number;
  duplicates: number;
  skipped: number;
}

export interface AnalyticsKpi {
  key: string;
  label: string;
  value: string;
  definition: string;
}

export interface AnalyticsKpiSnapshot {
  from: string;
  to: string;
  kpis: AnalyticsKpi[];
}

export interface FunnelStep {
  key: FunnelStepKey;
  label: string;
  sessions: number;
  conversionFromPrevious: number | null;
}

export interface FunnelSnapshot {
  from: string;
  to: string;
  steps: FunnelStep[];
}

export interface SearchAnalyticsRow {
  query: string;
  searches: number;
  zeroResults: number;
}

export interface SearchAnalyticsSnapshot {
  from: string;
  to: string;
  totalSearches: number;
  zeroResultRate: number;
  topQueries: SearchAnalyticsRow[];
}

export interface ProductAnalyticsRow {
  productSlug: string;
  views: number;
  addToCart: number;
}

export interface ProductAnalyticsSnapshot {
  from: string;
  to: string;
  products: ProductAnalyticsRow[];
}

export interface CohortRow {
  cohortMonth: string;
  customers: number;
  repeatCustomers: number;
  repeatRate: number;
}

export interface CohortSnapshot {
  from: string;
  to: string;
  cohorts: CohortRow[];
}
