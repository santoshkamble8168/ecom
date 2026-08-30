import type { AnalyticsEventInput, AnalyticsEventName } from "@ecom/types";

const SESSION_KEY = "ecom_session_id";
const DEBUG_STORAGE_KEY = "ecom_analytics_debug";

export interface AnalyticsClientConfig {
  endpoint: string;
  getAuthToken?: () => string | null;
  enabled?: boolean;
  debug?: boolean;
}

const config: AnalyticsClientConfig = {
  endpoint: "/api/v1/analytics/events",
  enabled: true,
  debug: false,
};

export function configureAnalytics(partial: Partial<AnalyticsClientConfig>): void {
  Object.assign(config, partial);
}

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function isAnalyticsDebug(): boolean {
  if (typeof window === "undefined") return Boolean(config.debug);
  if (config.debug) return true;
  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
}

export function track(
  name: AnalyticsEventName,
  properties?: Record<string, unknown>,
  path?: string,
): void {
  if (typeof window === "undefined") return;
  if (config.enabled === false) return;

  const event: AnalyticsEventInput = {
    clientEventId: crypto.randomUUID(),
    name,
    sessionId: getAnalyticsSessionId(),
    path: path ?? window.location.pathname,
    occurredAt: new Date().toISOString(),
    properties,
  };

  if (isAnalyticsDebug()) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event);
  }

  const token = config.getAuthToken?.() ?? null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  void fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ events: [event] }),
    keepalive: true,
  }).catch(() => {
    /* fire-and-forget: checkout and browsing must not wait on ingest */
  });
}
