import {
  ANALYTICS_EVENT_NAMES,
  FUNNEL_STEP_KEYS,
  type AnalyticsEventInput,
  type AnalyticsEventName,
  type FunnelStep,
  type FunnelStepKey,
} from "@ecom/types";

const EVENT_NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES);

const SECRET_KEYS = new Set([
  "email",
  "phone",
  "password",
  "token",
  "secret",
  "authorization",
  "otpcode",
  "code",
  "card",
  "cvv",
  "pan",
]);

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return EVENT_NAME_SET.has(value);
}

export function shouldSample(sessionId: string, sampleRate: number): boolean {
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  let hash = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return hash % 10_000 < Math.floor(sampleRate * 10_000);
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null> {
  if (!properties) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties).slice(0, 20)) {
    if (SECRET_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string") {
      out[key] = value.slice(0, 200);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else if (value == null) {
      out[key] = null;
    }
  }
  return out;
}

const PLP_PATH = /^\/(men|women|search|categories|collections)(\/|$)/i;

export function funnelStepForEvent(name: string, path?: string | null): FunnelStepKey | null {
  if (name === "product_view") return "pdp";
  if (name === "add_to_cart") return "cart";
  if (name === "checkout_start") return "checkout";
  if (name === "payment_attempt") return "payment";
  if (name === "order_placed") return "order";
  if (name === "page_view") {
    const normalized = (path ?? "/").split("?")[0] || "/";
    if (normalized === "/") return "homepage";
    if (PLP_PATH.test(normalized)) return "plp";
  }
  return null;
}

type TimedEvent = { sessionId: string; step: FunnelStepKey; occurredAt: number };

const STEP_LABEL: Record<FunnelStepKey, string> = {
  homepage: "Homepage",
  plp: "PLP",
  pdp: "PDP",
  cart: "Add to cart",
  checkout: "Checkout",
  payment: "Payment",
  order: "Order",
};

/**
 * Sequential funnel: a session counts at step N only if it reached step N-1
 * at an earlier or equal timestamp.
 */
export function computeFunnel(events: TimedEvent[]): FunnelStep[] {
  const bySession = new Map<string, Map<FunnelStepKey, number>>();
  for (const event of events) {
    let steps = bySession.get(event.sessionId);
    if (!steps) {
      steps = new Map();
      bySession.set(event.sessionId, steps);
    }
    const previous = steps.get(event.step);
    if (previous === undefined || event.occurredAt < previous) {
      steps.set(event.step, event.occurredAt);
    }
  }

  const counts = FUNNEL_STEP_KEYS.map(() => 0);
  for (const steps of bySession.values()) {
    let previousTime = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < FUNNEL_STEP_KEYS.length; i += 1) {
      const key = FUNNEL_STEP_KEYS[i];
      if (!key) continue;
      const at = steps.get(key);
      if (at === undefined || at < previousTime) break;
      counts[i] = (counts[i] ?? 0) + 1;
      previousTime = at;
    }
  }

  return FUNNEL_STEP_KEYS.map((key, index) => {
    const sessions = counts[index] ?? 0;
    const previous = index === 0 ? null : (counts[index - 1] ?? 0);
    return {
      key,
      label: STEP_LABEL[key],
      sessions,
      conversionFromPrevious: previous === null || previous === 0 ? (index === 0 ? null : 0) : sessions / previous,
    };
  });
}

export function isValidClientEventId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function normalizeIngestEvent(input: AnalyticsEventInput): AnalyticsEventInput | null {
  if (!isAnalyticsEventName(input.name)) return null;
  if (!input.sessionId || input.sessionId.length > 80) return null;
  if (!isValidClientEventId(input.clientEventId)) return null;
  return {
    ...input,
    name: input.name,
    path: input.path?.slice(0, 500),
    properties: sanitizeAnalyticsProperties(input.properties),
  };
}
