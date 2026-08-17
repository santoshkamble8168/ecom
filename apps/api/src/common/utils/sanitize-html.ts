/**
 * Pragmatic HTML sanitizer for admin-authored CMS/blog rich text.
 * Strips executable vectors (`script`/`iframe`/event handlers/`javascript:`)
 * while leaving semantic markup (`p`, `h2`, `a`, `ul`, `strong`, etc.) intact.
 * Not a full HTML parser — a follow-up should switch to DOMPurify if authors
 * need a richer allowlist.
 */
export function sanitizeRichHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(iframe|object|embed|link|meta|form|input|textarea|button|svg)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "$1=$2#$2");
}

/** Recursively sanitizes string values in a CMS `fields` JSON blob. */
export function sanitizeJsonStrings(value: unknown): unknown {
  if (typeof value === "string") return sanitizeRichHtml(value);
  if (Array.isArray(value)) return value.map(sanitizeJsonStrings);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, sanitizeJsonStrings(nested)]),
    );
  }
  return value;
}
