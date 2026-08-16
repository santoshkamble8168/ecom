/**
 * Browser uses same-origin `/api/v1` (Next rewrite → Nest) to avoid CORS.
 * Server components / RSC talk to Nest directly on :4000.
 */
export function getApiUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";
  }

  const configured = process.env.NEXT_PUBLIC_API_URL;
  // Absolute non-local API (e.g. staging) — use as-is.
  if (
    configured &&
    configured.startsWith("http") &&
    !configured.includes("localhost:4000") &&
    !configured.includes("127.0.0.1:4000")
  ) {
    return configured;
  }

  // Local/default: same-origin proxy via next.config.mjs rewrites.
  return "/api/v1";
}
