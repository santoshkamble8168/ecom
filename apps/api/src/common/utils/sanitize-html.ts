import sanitizeHtml from "sanitize-html";

const RICH_TEXT_TAGS = [
  "p", "br", "h1", "h2", "h3", "h4", "blockquote", "pre", "code",
  "ul", "ol", "li", "strong", "em", "b", "i", "u", "s", "a", "img",
] as const;

/** Parser-backed allowlist sanitizer for admin-authored CMS and blog HTML. */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...RICH_TEXT_TAGS],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
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
