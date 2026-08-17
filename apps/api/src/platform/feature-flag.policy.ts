import type { FeatureFlagEnvironment } from "@ecom/types";

export interface FeatureFlagEvaluationInput {
  isEnabled: boolean;
  environment: string;
  rolloutPercent: number;
}

const FEATURE_FLAG_ENVIRONMENTS: readonly FeatureFlagEnvironment[] = [
  "all",
  "development",
  "test",
  "production",
];

export function toFeatureFlagEnvironment(value: string): FeatureFlagEnvironment {
  return FEATURE_FLAG_ENVIRONMENTS.includes(value as FeatureFlagEnvironment)
    ? (value as FeatureFlagEnvironment)
    : "all";
}

/**
 * Global (non-sticky) feature-flag gate.
 *
 * Percentage rollout is an env-wide on/off threshold, not a per-user hash:
 * `rolloutPercent >= 100` is fully on; any lower value stays off until sticky
 * targeting is implemented.
 */
export function evaluateFeatureFlag(flag: FeatureFlagEvaluationInput, nodeEnv: string): boolean {
  if (!flag.isEnabled) return false;
  if (flag.environment !== "all" && flag.environment !== nodeEnv) return false;
  if (flag.rolloutPercent <= 0) return false;
  if (flag.rolloutPercent >= 100) return true;
  return false;
}
