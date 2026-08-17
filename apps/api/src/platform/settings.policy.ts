import { ValidationError } from "@ecom/shared";

export type PlatformSettingValue = string | boolean;

type SettingRule =
  | { kind: "string"; minLength?: number; maxLength?: number; exactLength?: number }
  | { kind: "boolean" };

const SETTING_RULES: Record<string, SettingRule> = {
  "store.name": { kind: "string", minLength: 1, maxLength: 80 },
  "store.currency": { kind: "string", exactLength: 3 },
  "store.timezone": { kind: "string" },
  "store.maintenanceMode": { kind: "boolean" },
  "seo.defaultTitle": { kind: "string" },
  "notifications.emailEnabled": { kind: "boolean" },
};

export const ALLOWED_SETTING_KEYS = Object.keys(SETTING_RULES);

function describeRule(key: string, rule: SettingRule): string {
  if (rule.kind === "boolean") return `"${key}" must be a boolean`;
  if (rule.exactLength !== undefined) {
    return `"${key}" must be a string of length ${rule.exactLength}`;
  }
  if (rule.minLength !== undefined || rule.maxLength !== undefined) {
    const min = rule.minLength ?? 0;
    const max = rule.maxLength ?? "∞";
    return `"${key}" must be a string between ${min} and ${max} characters`;
  }
  return `"${key}" must be a string`;
}

function settingError(key: string, value: unknown): string | null {
  const rule = SETTING_RULES[key];
  if (!rule) return `Unknown setting key "${key}"`;

  if (rule.kind === "boolean") {
    return typeof value === "boolean" ? null : describeRule(key, rule);
  }

  if (typeof value !== "string") return describeRule(key, rule);
  if (rule.exactLength !== undefined && value.length !== rule.exactLength) {
    return describeRule(key, rule);
  }
  if (rule.minLength !== undefined && value.length < rule.minLength) {
    return describeRule(key, rule);
  }
  if (rule.maxLength !== undefined && value.length > rule.maxLength) {
    return describeRule(key, rule);
  }
  return null;
}

export function validateSettingsPatch(
  settings: Record<string, unknown>,
): Record<string, PlatformSettingValue> {
  const errors: string[] = [];
  const validated: Record<string, PlatformSettingValue> = {};

  for (const [key, value] of Object.entries(settings)) {
    const error = settingError(key, value);
    if (error) {
      errors.push(error);
      continue;
    }
    validated[key] = value as PlatformSettingValue;
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join("; "), { errors });
  }

  return validated;
}
