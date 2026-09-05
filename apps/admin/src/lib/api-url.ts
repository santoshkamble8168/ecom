/**
 * Browser uses same-origin `/api/v1` (Next rewrite → Nest) to avoid CORS
 * and connection-refused when the page is opened as localhost vs 127.0.0.1.
 * Server-side code talks to Nest directly on :4000.
 */
export function getApiUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";
  }

  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (
    configured &&
    configured.startsWith("http") &&
    !configured.includes("localhost:4000") &&
    !configured.includes("127.0.0.1:4000")
  ) {
    return configured;
  }

  return "/api/v1";
}
