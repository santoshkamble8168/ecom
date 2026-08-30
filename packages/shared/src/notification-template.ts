import { ValidationError } from "./errors";

const VAR_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function collectTemplateVariables(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(VAR_PATTERN)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

export function renderTemplate(
  source: string,
  variables: Record<string, unknown>,
  options: { escapeHtml?: boolean } = {},
): string {
  return source.replace(VAR_PATTERN, (_full, name: string) => {
    const raw = variables[name];
    if (raw === undefined || raw === null) return "";
    const text = String(raw);
    return options.escapeHtml ? htmlEscape(text) : text;
  });
}

export function assertRequiredVariables(
  required: string[],
  variables: Record<string, unknown>,
): void {
  const missing = required.filter((key) => {
    const value = variables[key];
    return value === undefined || value === null || String(value).trim() === "";
  });
  if (missing.length > 0) {
    throw new ValidationError(`Missing template variables: ${missing.join(", ")}`, { missing });
  }
}

export type PreferenceChannel = "email" | "sms";
export type PreferenceCategory = "transactional" | "marketing" | "operational";

export interface PreferenceFlags {
  emailTransactional: boolean;
  emailMarketing: boolean;
  smsTransactional: boolean;
  smsMarketing: boolean;
  unsubscribedAt?: string | Date | null;
}

/**
 * Marketing requires an explicit opt-in on that channel and no global
 * unsubscribe. Transactional and operational always send when a destination exists.
 */
export function allowsNotification(
  category: PreferenceCategory,
  channel: PreferenceChannel,
  prefs: PreferenceFlags | null,
): boolean {
  if (category === "transactional" || category === "operational") return true;
  if (!prefs) return false;
  if (prefs.unsubscribedAt) return false;
  if (channel === "email") return prefs.emailMarketing === true;
  return prefs.smsMarketing === true;
}

const SECRET_KEYS = new Set(["otpcode", "code", "password", "token", "secret", "authorization"]);

export function sanitizePayloadPreview(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SECRET_KEYS.has(key.toLowerCase())) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (value == null) {
      out[key] = null;
    } else {
      out[key] = "[omitted]";
    }
  }
  return out;
}
